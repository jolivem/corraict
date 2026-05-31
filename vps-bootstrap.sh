#!/usr/bin/env bash
#
# vps-bootstrap.sh — hardening one-shot du VPS Hetzner.
#
# Idempotent : ré-exécutable sans casse. Sudo requis.
# Complète le firewall Hetzner Cloud (déjà activé via la console) côté OS.
#
# Usage :
#   sudo ./vps-bootstrap.sh           # upgrades + unattended-upgrades + fail2ban
#   sudo ./vps-bootstrap.sh --ssh     # ci-dessus + SSH hardening (key-only, no root)
#
# Le `--ssh` est isolé volontairement : tu le lances dans un second terminal
# APRÈS avoir confirmé que ta session courante (par clé) marche bien, pour
# éviter le risque de te lock out.

set -euo pipefail

require_root() {
  if [[ $EUID -ne 0 ]]; then
    echo "ERROR: ce script doit tourner avec sudo." >&2
    exit 1
  fi
}

target_user() {
  # L'utilisateur réel (pas root) qui a invoqué sudo : c'est SON authorized_keys
  # qu'on va vérifier avant de désactiver le mot de passe.
  echo "${SUDO_USER:-}"
}

step_apt_upgrade() {
  echo "==> apt update + upgrade"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get upgrade -y -qq
}

step_unattended_upgrades() {
  echo "==> unattended-upgrades"
  apt-get install -y -qq unattended-upgrades apt-listchanges
  cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
  systemctl enable --now unattended-upgrades >/dev/null
  echo "    OK — patches de sécurité installés automatiquement chaque jour."
}

step_fail2ban() {
  echo "==> fail2ban"
  apt-get install -y -qq fail2ban
  # Jail SSH minimale. backend = systemd pour lire le journal sshd, plus
  # robuste que parser /var/log/auth.log sur Ubuntu récent.
  cat > /etc/fail2ban/jail.d/aicorrect.local <<'EOF'
[sshd]
enabled = true
port    = ssh
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
  systemctl enable --now fail2ban >/dev/null
  if ! systemctl reload fail2ban >/dev/null 2>&1; then
    systemctl restart fail2ban
  fi
  echo "    OK — 5 échecs SSH en 10min → ban 1h. État : fail2ban-client status sshd"
}

step_ssh_hardening() {
  echo "==> SSH hardening"
  local user home auth conf backup
  user=$(target_user)
  if [[ -z "$user" ]]; then
    echo "ERROR: SUDO_USER vide. Lance depuis ton compte habituel avec 'sudo ./vps-bootstrap.sh --ssh'." >&2
    exit 1
  fi
  home=$(getent passwd "$user" | cut -d: -f6)
  auth="$home/.ssh/authorized_keys"
  if [[ ! -s "$auth" ]]; then
    echo "ERROR: $auth absent ou vide pour $user — refus d'activer key-only auth." >&2
    echo "       Depuis ton poste : ssh-copy-id $user@<IP_DU_VPS>" >&2
    exit 1
  fi
  echo "    Clé(s) trouvée(s) pour $user dans $auth — OK."

  conf=/etc/ssh/sshd_config
  backup="${conf}.bootstrap-bak-$(date +%Y%m%d-%H%M%S)"
  cp -a "$conf" "$backup"
  echo "    Backup : $backup"

  # set_directive <key> <value> : remplace la ligne (commentée ou non) sinon
  # ajoute. Idempotent — relance sans effet de bord.
  set_directive() {
    local key="$1" value="$2"
    if grep -qE "^[#[:space:]]*${key}[[:space:]]" "$conf"; then
      sed -i -E "s|^[#[:space:]]*${key}[[:space:]].*|${key} ${value}|" "$conf"
    else
      echo "${key} ${value}" >> "$conf"
    fi
  }

  set_directive PasswordAuthentication no
  set_directive ChallengeResponseAuthentication no
  set_directive KbdInteractiveAuthentication no
  set_directive PermitRootLogin no
  set_directive PubkeyAuthentication yes

  if ! sshd -t; then
    echo "ERROR: sshd -t échoue après modification. Restauration du backup." >&2
    cp -a "$backup" "$conf"
    exit 1
  fi

  if systemctl is-active --quiet ssh; then
    systemctl reload ssh
  elif systemctl is-active --quiet sshd; then
    systemctl reload sshd
  else
    echo "WARN: ni 'ssh' ni 'sshd' n'est actif — vérifie manuellement." >&2
  fi

  echo "    OK — SSH key-only activé, root login désactivé."
  echo
  echo "    ⚠️  GARDE TA SESSION COURANTE OUVERTE et OUVRE UN SECOND TERMINAL"
  echo "       pour vérifier que 'ssh $user@<IP>' fonctionne toujours."
  echo "       Si problème : cp -a $backup $conf && systemctl reload ssh"
}

usage() {
  cat <<EOF
Usage : sudo $0 [--ssh]

  (sans option)  installe apt upgrades, unattended-upgrades, fail2ban
  --ssh          + désactive le mot de passe SSH et le root login (key-only)
EOF
  exit 1
}

main() {
  require_root
  local do_ssh=0
  for arg in "$@"; do
    case "$arg" in
      --ssh) do_ssh=1 ;;
      -h|--help) usage ;;
      *) echo "Argument inconnu : $arg" >&2; usage ;;
    esac
  done

  step_apt_upgrade
  step_unattended_upgrades
  step_fail2ban

  if [[ $do_ssh -eq 1 ]]; then
    step_ssh_hardening
  else
    echo
    echo "ℹ️  SSH hardening non appliqué. Pour l'activer (après vérification de"
    echo "    ton accès par clé) : sudo ./vps-bootstrap.sh --ssh"
  fi

  echo
  echo "✓ Bootstrap terminé."
}

main "$@"
