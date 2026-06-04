import type { FaqCategory } from './faq';

/**
 * FAQ content in English. Product name: "Plume".
 * Each answer is split into paragraphs (direct answer, then detail).
 */
export const FAQ_EN: FaqCategory[] = [
  {
    id: 'comprendre',
    title: 'Understanding Plume',
    items: [
      {
        q: 'What is Plume?',
        a: [
          'Plume is an Android phone keyboard that fixes the spelling and grammar of your text with a single tap on a button, without rewording your sentences.',
          'It replaces your usual keyboard and works in all your apps. You type normally, then tap the “Correct” button and Plume fixes the mistakes. Its distinctive feature: it behaves exactly like a regular keyboard (same typing, same suggestions, same comfort) while adding correction. Plume was designed to be simple and restful to read, especially for people with dyslexia and dysorthographia.',
        ],
      },
      {
        q: 'What is Plume for?',
        a: [
          'Plume helps you write without mistakes every day (messages, emails, notes, social media) while keeping your own words and style.',
          'In practice, you type your text normally, then tap the “Correct” button: Plume instantly fixes spelling and grammar mistakes, without you having to copy-paste your text elsewhere or check every word. It is a useful aid for anyone who wants to write with confidence, and a real day-to-day support for people who doubt their spelling or have dyslexia.',
        ],
      },
      {
        q: 'Is there a phone keyboard that corrects mistakes?',
        a: [
          'Yes. Plume is an Android keyboard that fixes spelling and grammar mistakes right on your phone: you write, you tap the “Correct” button, and the text is corrected.',
          'That is precisely what sets it apart. Most powerful correction tools were first designed for the computer or the web browser. Yet today, most of what we write (messages, emails, posts) is typed on a phone. Plume brings correction to where you actually write: into your mobile keyboard, in any app, without going through a separate piece of software.',
        ],
      },
      {
        q: 'Is correction automatic, or do you have to press a button?',
        a: [
          'You press a button. You first write your text, then you tap the keyboard’s “Correct” button, and Plume corrects your text right away.',
          'So correction does not trigger on its own while you type: you decide when to correct, with a single tap. Everything happens on the spot, in the app where you are writing, with no need to copy-paste your text into another tool.',
        ],
      },
      {
        q: 'Does Plume correct spelling and grammar?',
        a: [
          'Yes. Plume fixes both spelling and grammar: agreement errors, conjugation, past participles, homophones (a/à, ou/où, ces/ses…), punctuation and typos.',
          'Correction happens with a tap on the “Correct” button. The goal is not only to fix easy mistakes, but also those that often go unnoticed, such as agreements and homophones.',
        ],
      },
      {
        q: 'Does Plume reword or change my style?',
        a: [
          'No. Plume only fixes mistakes: it does not reword your sentences, does not change your tone or style, and does not replace your words with others.',
          'This is an important difference from writing assistants that rewrite or “improve” your texts. With Plume, what you read after correction are your own sentences, simply without the mistakes. You keep your voice, your register and your phrasing.',
        ],
      },
      {
        q: 'Which apps does Plume work in?',
        a: [
          'Plume works in every app where you write: WhatsApp, SMS, Gmail and other messaging apps, Instagram, Messenger, your browser, your notes, and so on.',
          'Because Plume is a keyboard, it follows you everywhere: as soon as the keyboard opens, you just tap the “Correct” button. And since it replaces your keyboard while behaving like a normal one, you don’t have to juggle two keyboards, one to write and one to correct.',
        ],
      },
    ],
  },
  {
    id: 'dyslexie',
    title: 'Dyslexia and who it’s for',
    items: [
      {
        q: 'Is there an app to write without mistakes when you have dyslexia?',
        a: [
          'Yes. Plume is a keyboard app designed to help people with dyslexia and dysorthographia write without mistakes on their phone.',
          'You type your message as usual, you tap the “Correct” button, and Plume fixes spelling and grammar without changing your words. The app is designed to be simple, readable and judgement-free, so you can write with confidence every day.',
        ],
      },
      {
        q: 'What is the best correction app for a dyslexic adult?',
        a: [
          'For a dyslexic adult, a good correction app should combine three things: correct without rewriting, stay very simple to use, and be readable and restful for the eyes. That is exactly what Plume was designed for.',
          'Many existing tools target children, speech-therapy rehabilitation, or add a host of features (rewriting, translation, chatbot) that complicate usage. Plume makes the opposite choice: it focuses on everyday correction for adults, in a clean and calming interface.',
        ],
      },
      {
        q: 'Is Plume suitable for dyslexia and dysorthographia?',
        a: [
          'Yes. Plume was designed from the start for people with dyslexia and dysorthographia.',
          'This means a readable font with clearly distinct letters, soft colours, no anxiety-inducing red underline, a simple interface and one-tap correction. The idea is to remove the mental load tied to spelling, without sending people back to their difficulties.',
        ],
      },
      {
        q: 'Does Plume work if I write “by sound” (phonetically)?',
        a: [
          'Yes, in most cases. Plume relies on artificial intelligence able to understand words written phonetically (for example “demin” for “demain”) and to correct them.',
          'This matters, because people with dysorthographia often write by sound. AI handles this kind of writing far better than a traditional corrector based on fixed rules. If a sentence is very far from the expected spelling, the result may occasionally need a second correction, but Plume is built precisely for these cases.',
        ],
      },
      {
        q: 'Is Plume only for people with dyslexia?',
        a: [
          'No. Plume is designed for people with dys conditions, but it is for anyone who wants to write without mistakes.',
          'You don’t need to be dyslexic to use it. The app’s name and appearance signal nothing in particular: no one will know you use it to help yourself. It is an everyday tool, with no label and no stigma.',
        ],
      },
      {
        q: 'Do I need a dyslexia diagnosis to use Plume?',
        a: [
          'No. No diagnosis is required to download and use Plume.',
          'Plume is neither a medical device nor a treatment tool: it is a writing aid, open to everyone. You can use it whether you are diagnosed, in the process of being diagnosed, or simply bothered by spelling.',
        ],
      },
      {
        q: 'How is Plume designed for dyslexic readers?',
        a: [
          'Plume applies the readability recommendations recognised for people with dys conditions: a clear font with well-differentiated letters, a soft background rather than white, calming colours and no visual clutter.',
          'The goal is to write without stress. No dazzling white background, no red that points to mistakes, no interface crowded with buttons. Just your text, and a tap to correct it.',
        ],
      },
    ],
  },
  {
    id: 'fonctionnement',
    title: 'How it works and installation',
    items: [
      {
        q: 'How do I install and enable Plume on Android?',
        a: [
          'To install Plume, download the app from the Google Play Store, then enable the Plume keyboard in your phone’s settings and select it as the active keyboard.',
          'It takes a few minutes and is done only once. Once enabled, Plume appears as soon as you open a text field, in any app. You write, then you tap the “Correct” button.',
        ],
      },
      {
        q: 'Do I need to create an account? How do I sign in?',
        a: [
          'Yes, Plume requires a simple sign-up with your email address, with no password to create.',
          'Each time you sign in, a one-time code is sent to your email: just enter it to access the app. So you have no password to remember, which is both simpler and safer. Only your email address is kept.',
        ],
      },
      {
        q: 'How does Plume correct my texts?',
        a: [
          'Plume corrects your texts using advanced artificial intelligence. When you tap “Correct”, your text is analysed and returned corrected in an instant.',
          'Processing is handled by an artificial-intelligence provider located in the European Union. Your texts are not kept by Plume once the correction is done.',
        ],
      },
      {
        q: 'Does Plume work offline?',
        a: [
          'No. Plume needs an internet connection to correct, because the correction is performed by an online artificial intelligence.',
          'You can write offline like with any keyboard, but the “Correct” button needs the internet to work.',
        ],
      },
      {
        q: 'Does Plume offer voice dictation?',
        a: [
          'Not in the first version. Voice dictation is not available at Plume’s launch.',
          'In the meantime, you can keep using your phone’s voice input if you are used to it. Plume focuses first on what it does best: fixing spelling and grammar with one tap.',
        ],
      },
      {
        q: 'Do I have to replace my usual keyboard with Plume?',
        a: [
          'Yes, Plume becomes your keyboard, but it works exactly like a regular keyboard.',
          'You lose neither the typing comfort nor the suggestions you are used to. That is precisely what sets Plume apart from tools where you have to juggle two keyboards, one to write and one to correct. You keep a single keyboard, with correction added, and you can switch back to your old keyboard at any time.',
        ],
      },
    ],
  },
  {
    id: 'comparaisons',
    title: 'Comparisons',
    items: [
      {
        q: 'What is the difference between Plume and Scribens?',
        a: [
          'The main difference is that Plume is designed specifically for people with dyslexia and limits itself to correcting, whereas Scribens is a general-purpose corrector that also adds rewording, translation and many languages.',
          'Scribens is a powerful, free tool, but it flags mistakes in red and offers many features, which can weigh down the experience. Plume makes a different choice: a calm, readable interface designed for dys users, with no red, no rewording, and a keyboard that behaves like a normal one so you don’t have to switch. If you’re looking for a free multilingual Swiss army knife, Scribens fits; if you want a simple, soothing tool focused on correction, Plume is a better fit.',
        ],
      },
      {
        q: 'Plume or Scribens: which to choose when you have dyslexia?',
        a: [
          'For a dyslexic person, Plume is designed to be more restful to use, while Scribens is more complete but also more cluttered.',
          'Plume bets on readability (clear font, soft colours, no red underline), simplicity (a single button to correct) and one keyboard that replaces yours without losing comfort. Scribens remains a valid, free option, but its red display and large number of features can be less comfortable when spelling is already a source of stress. It’s best to try both, but Plume was designed precisely for this need.',
        ],
      },
      {
        q: 'Is Plume an alternative to Grammarly in French?',
        a: [
          'Yes. Plume can be seen as a French alternative to Grammarly, with one important difference: Plume corrects without rewriting.',
          'Grammarly is primarily designed for English and offers, on top of correction, AI rewriting of your sentences. Plume corrects French as well as other languages, and never touches your style or your words. If you want to keep your exact phrasing, Plume is more relevant.',
        ],
      },
      {
        q: 'Why use Plume rather than ChatGPT to correct?',
        a: [
          'Because Plume corrects directly in your keyboard, in one tap, without changing your style, whereas ChatGPT forces you to copy-paste your text and tends to reword it.',
          'With ChatGPT, you leave your conversation, paste your message, get back an often rewritten version, then return. With Plume, you stay in the app where you write, you tap “Correct”, and you get your sentences corrected but unchanged in tone. It’s faster, more discreet, and it preserves the way you write.',
        ],
      },
      {
        q: 'Does Plume replace Gboard’s built-in corrector?',
        a: [
          'Plume goes further than Gboard’s autocorrect: it fixes grammar, agreements, conjugation and homophones across your whole text, on demand.',
          'Gboard mainly fixes typos and offers word-by-word suggestions while you type, but it does not take a whole sentence and correct its grammar. Plume replaces your keyboard while behaving like a normal one, and adds this complete correction with one tap on the “Correct” button.',
        ],
      },
    ],
  },
  {
    id: 'vie-privee',
    title: 'Privacy and data',
    items: [
      {
        q: 'Are my texts recorded or stored?',
        a: [
          'No, Plume does not keep your texts. They are corrected, then not retained on our servers.',
          'Plume only sends your text when you tap the “Correct” button, never continuously while you type. The artificial-intelligence provider that performs the correction may keep requests for a short period (at most 30 days) solely to prevent abuse, before deleting them.',
        ],
      },
      {
        q: 'Are my texts used to train an AI?',
        a: [
          'No. Your texts are never used to train an artificial intelligence.',
          'They are used only to produce the correction you request, then are not reused.',
        ],
      },
      {
        q: 'Where is my data processed?',
        a: [
          'Your texts are processed within the European Union.',
          'Plume relies on an artificial-intelligence provider based in the EU, and the only data Plume keeps on your side is your email address.',
        ],
      },
      {
        q: 'Is Plume GDPR-compliant?',
        a: [
          'Yes. Plume complies with the GDPR.',
          'You can access your data, export it in JSON format and delete your account at any time from your dashboard. Plume applies the principle of minimisation: it collects only what is strictly necessary.',
        ],
      },
      {
        q: 'Who can see what I write?',
        a: [
          'No one reads what you write. Plume only sends your text for correction when you tap the button, and does not keep it.',
          'This manual trigger matters: there is no continuous monitoring of your typing, unlike a tool that would analyse everything all the time.',
        ],
      },
    ],
  },
  {
    id: 'prix',
    title: 'Pricing and subscription',
    items: [
      {
        q: 'Is Plume free?',
        a: [
          'Plume is free for two weeks, then becomes paid through a subscription.',
          'You enjoy full access without paying during the trial period, and you then decide whether you want to continue.',
        ],
      },
      {
        q: 'Why is Plume paid?',
        a: [
          'Plume is paid because each correction is processed by an artificial-intelligence provider that we pay for every use.',
          'In other words, correcting a text has a real cost for us every time you tap “Correct”. To cover these costs and run the service over time, we have to offer it as a subscription. We chose to keep the price deliberately low, at €2.99 per month.',
        ],
      },
      {
        q: 'How much does Plume cost?',
        a: [
          'Plume costs €2.99 per month, after a free trial period of two weeks.',
          'There are no hidden fees: the subscription is monthly and its price is clear.',
        ],
      },
      {
        q: 'How does the free trial work?',
        a: [
          'You get two weeks of full, free access as soon as you create your account, with no charge.',
          'At the end of the two weeks, the €2.99-per-month subscription takes over. If you don’t wish to continue, you can cancel before the end of the trial.',
        ],
      },
      {
        q: 'Is there a commitment? How do I cancel?',
        a: [
          'No, there is no commitment. You can cancel at any time from your dashboard.',
          'Cancellation takes effect at the end of the period already paid, with no fee and no justification required.',
        ],
      },
    ],
  },
  {
    id: 'compatibilite',
    title: 'Compatibility',
    items: [
      {
        q: 'Which devices does Plume work on?',
        a: [
          'Plume works on Android phones and tablets, accompanied by a website to manage your account.',
          'The keyboard app installs on Android, and the website is used to create your account and manage your subscription and your devices.',
        ],
      },
      {
        q: 'Is Plume available on iPhone?',
        a: ['Not at the moment. Plume is available on Android only.'],
      },
      {
        q: 'Does Plume work in languages other than French?',
        a: [
          'Yes. Plume corrects in all languages, even though it was designed first for the French-speaking audience.',
          'So you can write and correct your texts in any language, keeping the same flow: you write, you tap “Correct”.',
        ],
      },
    ],
  },
  {
    id: 'reassurance',
    title: 'Reassurance',
    items: [
      {
        q: 'Does Plume slow down typing?',
        a: [
          'No. Plume behaves like a regular keyboard for typing, and correction is only triggered when you press the button.',
          'Because it does not analyse your text continuously, there is no slowdown while you write.',
        ],
      },
      {
        q: 'Does Plume handle tricky agreements, homophones and conjugations?',
        a: [
          'Yes. Plume fixes agreements, homophones (a/à, ces/ses, ou/où) and conjugations, not just typos.',
          'Thanks to artificial intelligence, it takes the sentence context into account to handle these cases that often escape simple correctors.',
        ],
      },
      {
        q: 'What happens if Plume gets it wrong?',
        a: [
          'If Plume suggests a correction that doesn’t suit you, a button lets you go back to the text as it was before the correction.',
          'Plume is an aid, not an authority: you always have the final say and can undo a correction with one tap to restore your original text.',
        ],
      },
      {
        q: 'Can a minor use Plume?',
        a: [
          'No. Plume is reserved for adults, aged 18 and over.',
          'Sign-up requires being at least 18 years old, in accordance with the terms of use.',
        ],
      },
    ],
  },
];
