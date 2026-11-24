'use strict';
/* =====================================================================
   Corey: every word in the book lives here. Edit the text, not app.js.
   - Chapters render in the order they appear in CONTENT.chapters.
   - A message slip with no "at" reuses the timestamp of the slip before it.
   - who: "cassie" prints in blue, "corey" prints in purple.
   - GATE.enabled = false skips the index-card question.
   ===================================================================== */
const GATE = { enabled: true };

const CONTENT = {
  gate: {
    prompt: "Who Is The Person Who Adores You The Most In The World?",
    placeholder: "his name",
    wrong: "Guess again. You know this one.",
    button: "open",
    answers: ["corey", "corey.", "corey!"],
  },

  names: { cassie: "Cassie", corey: "Corey" },

  ui: {
    chapterWord: "Chapter",
    contents: "contents",
    contentsTitle: "Contents",
    close: "close",
    soundOff: "sound: off",
    soundOn: "sound: on",
    previous: "previous",
    next: (title) => `next: ${title}`,
    progress: (label) => label,
    chapterOf: (numeral, last) => `Chapter ${numeral} of ${last}`,
    tap: "tap",
    coach: "tap anything that shimmers. swipe or use the arrows to turn pages. the ribbon at the top is the contents.",
    coachOk: "got it",
    petal: "a pressed rose petal",
    petals: (n, total) => `pressed flowers: ${n} of ${total}`,
    stateRead: "read",
    stateUnread: "unread",
    stateHere: "you are here",
    ribbonsGroup: "six bookmark ribbons, each one an annotation",
    ribbonLabel: (label) => `annotation: ${label}`,
    marginNote: "margin note",
    scribble: "a single word, scribbled out in ink",
    stamp: "an indigo ink stamp: a small heart with a rose sprig",
    holdEasy: "turn the page",
    wordNext: "tap for the next word",
    feed: "a feed of blurred, nameless cards scrolling past",
    clockLabel: (place, time) => `${place}: ${time}`,
    envelope: (label) => `open the envelope for ${label}`,
    signCard: (n) => `sign ${n}, face down`,
    tabLabel: (label) => `reader's note: ${label}`,
    shelf: "a bookstore shelf with one reserved face-out slot",
    shelfSlot: "the reserved slot",
    note: (title) => `the folded poem: ${title}`,
    scrollHandle: "the scroll handle: drag down to unroll",
    initial: (n) => `initial clause ${n}`,
    roseTrace: "the other half of the rose: trace over the dotted outline",
    roseHold: "ink the other half",
    signPad: "signature pad",
    signSaved: "your signature",
    mixer: "colour mixer, from blue to purple",
  },

  chapters: [
    /* ---------------- cover ---------------- */
    {
      id: "cover", numeral: "", title: "Marginalia", slug: "cover", type: "cover",
      subtitle: "notes written in the margins, for Cassie",
      prompt: "break the seal",
      footer: "a few pages. no deadline.",
      jump: "jump to the last page",
      resume: "continue where you left off",
      blocks: [],
    },

    /* ---------------- contents ---------------- */
    {
      id: "contents", numeral: "", title: "Contents", slug: "contents", type: "contents",
      subtitle: "read in order, or don't. it's your book.",
      blocks: [],
    },

    /* ---------------- prologue ---------------- */
    {
      id: "prologue", numeral: "", label: "Prologue", title: "The Preview", slug: "prologue", type: "chapter",
      petal: true,
      blocks: [
        { type: "messages", items: [
          { who: "cassie", at: "Nov 24 · 3:45 AM ON · 1:45 AM BC", text: "SHOW ME A PREVIEW" },
          { who: "cassie", text: "what is this torture hahaha" },
        ] },
        { type: "prose", paras: [
          "You asked for a preview. I said no. Respectfully, I’d say no again.",
          "A preview is a few pages pulled out of context, and you deserve the whole book.",
          "So here it is: everything I’ve been writing since we started talking. Take your time. There’s no wrong way to read it, and nothing in here expects anything back.",
        ] },
        { type: "margin", text: "It’s probably past your bedtime. You’re reading this anyway. I know you." },
      ],
    },

    /* ---------------- I ---------------- */
    {
      id: "ch1", numeral: "I", title: "Serendipity", slug: "serendipity", type: "chapter",
      reveal: "tap", more: "keep reading", turn: "turn the page",
      blocks: [
        { type: "prose", paras: [
          "Most connections have to be built. Small talk, scaffolding, the careful work of figuring out what to say next.",
          "This one arrived already written.",
          "The banter landed on the first try. The jokes never needed explaining. We were teasing each other like we’d been doing it for years, and neither of us had to try.",
          "You messaged that it was something out of a movie. Something out of literature. I think you were right, and I think it’s the most accurate review either of us has ever written.",
        ] },
        { type: "messages", play: "play the transcript", items: [
          { who: "corey", at: "Nov 24 · 1:41 AM ON · 11:41 PM BC", text: "Ugh we're just something out of a movie Actually" },
          { who: "corey", text: "Something out of literature" },
          { who: "cassie", text: "Serendipity" },
        ], caption: "One word. You always did have the better editor’s instinct." },
        { type: "poem", lines: [
          "I’ve read enough to know",
          "the good stories don’t announce themselves.",
          "They just begin,",
          "and by the time you notice,",
          "it’s three in the morning",
          "and you’ve forgotten how to put them down.",
        ] },
        { type: "margin", text: "3:00 AM, again. Somewhere between your last story and my next bad joke, the clock gave up on us." },
      ],
    },

    /* ---------------- II ---------------- */
    {
      id: "ch2", numeral: "II", title: "Thirteen Years", slug: "thirteen-years", type: "chapter",
      petal: true,
      blocks: [
        { type: "prose", paras: [
          "For thirteen years we were names on each other’s screens. Scrolling past. Separate lives, both of us writing, neither of us knowing.",
          "Then one night you messaged me about how much you hate writing research.",
          "That’s it. That’s the inciting incident. Not a rainstorm, not a meet-cute. Research.",
        ] },
        { type: "feed", button: "stop scrolling", name: "Cassie", from: 2013, to: 2026,
          caption: "Thirteen years to stop scrolling. Worth the wait." },
        { type: "messages", items: [
          { who: "cassie", at: "Nov 18 · 11:36 PM ON · 9:36 PM BC", text: "I guess this is what my gut, subconscious, whatever was telling me lol. You have some unique ass pull on me" },
          { who: "cassie", at: "Nov 19 · 9:06 PM ON · 7:06 PM BC", text: "Thought we'd chat about writing and maybe some random stuff but it turned into a lot more lol" },
        ] },
        { type: "margin", text: "#writers #researchfriends (my hashtags, still standing by them)" },
      ],
    },

    /* ---------------- III ---------------- */
    {
      id: "ch3", numeral: "III", title: "One of One", slug: "one-of-one", type: "chapter",
      blocks: [
        { type: "wordStack", who: "cassie", at: "Nov 24 · 3:21 AM ON · 1:21 AM BC",
          words: ["Nothing", "About", "You", "Is", "Generic", "Or", "Baseline"],
          reply: { who: "corey", text: "Nothing about you is either 🫠" } },
        { type: "margin", text: "“Baseline is boring. 🥱” (you, Nov 18. You were right then too.)" },
        { type: "prose", paras: [
          "You told me nothing about me is generic or baseline.",
          "I’m handing that line back to you. Annotated.",
        ] },
        { type: "ribbons",
          items: [
            { label: "Her mind", note: "You think in full paragraphs. You notice the thing underneath the thing. Talking to you feels like reading something I didn’t know I needed." },
            { label: "Her wit", note: "You never let me get away with anything, and I’ve never enjoyed losing an argument more. Banter like ours can’t be taught. We just have it." },
            { label: "Her beauty", note: "“Breathtaking” isn’t a big enough word, so I’ll say it plainly: you are stunning. The kind of beautiful that makes me lose my place mid-sentence." },
            { label: "Her strength", note: "You hold a lot with grace, and you still show up warm, funny and generous. That isn’t common. That’s rare." },
            { label: "Her heart", note: "You’re always looking for a way to make someone feel appreciated. (Yes, I know you’ll never accept a no-gifts rule. Noted. Reluctantly.)" },
            { label: "The rose", note: "For someone who swears she doesn’t have a green thumb, you carry a rose that never wilts. I noticed." },
          ],
          counter: (n, total) => `${n} of ${total} annotations read`,
          done: "Six notes, and I’m nowhere near the end of the list.",
          quote: "And how you make me feel: valued, understood, completely drawn in. Like the best thing ever. That’s a ridiculous phrase for a poet to use, and it’s still the truest one I have.",
          turn: "turn the page",
        },
      ],
    },

    /* ---------------- IV ---------------- */
    {
      id: "ch4", numeral: "IV", title: "Blue Rules", slug: "blue-rules", type: "chapter",
      petal: true,
      blocks: [
        { type: "messages", items: [
          { who: "cassie", at: "Nov 23 · 2:08 AM ON · 12:08 AM BC", text: "And about the colours. BLUE RULES. but I'll sway ya 😉" },
          { who: "corey", text: "I like blue too" },
          { who: "corey", at: "Nov 23 · 2:51 PM ON · 12:51 PM BC", text: "Haha are you converting to the purple hard 😜" },
          { who: "cassie", at: "Nov 23 · 2:56 PM ON · 12:56 PM BC", text: "absolutely not. Blue forever 💙🩵" },
        ] },
        { type: "prose", paras: [
          "Blue is yours. Purple is mine. This whole book is written in both: every time you speak on these pages it’s in blue, and every time I do it’s in purple.",
          "Where they overlap, you get indigo. Which also happens to be the name of the bookstore where your novel belongs.",
        ] },
        { type: "colourMixer", left: "blue (Cassie)", right: "purple (Corey)",
          says: { left: "Blue rules. Fine. Don’t tell anyone.", right: "Purple, obviously.", center: "Indigo. Ours.", between: "Swaying." },
          plate: "Indigo" },
        { type: "auraCards", heading: "If you had Eliza’s gift", cards: [
          { front: "How you read me", tint: "blue",
            slip: { who: "cassie", at: "Nov 20 · 4:58 PM ON · 2:58 PM BC", text: "Some blue - trying to find your way while dealing with some bs - and some yellow. Creativity, brightness, so much potential!" } },
          { front: "How I read you", tint: "gold",
            text: "Warm gold, with a blue glow around it. Gold for how genuinely creative you are, electric blue for how deep your mind goes, and a little pink because you’re so cute it’s honestly unfair." },
        ] },
        { type: "margin", text: "Blue and purple hearts are the colours veins look through skin. I said that once at 8 PM on a Sunday and I’m putting it in print so it counts." },
      ],
    },

    /* ---------------- V ---------------- */
    {
      id: "ch5", numeral: "V", title: "The Reader", slug: "the-reader", type: "chapter",
      petal: true,
      blocks: [
        { type: "messages", items: [
          { who: "corey", at: "Nov 20 · 1:53 AM ON · 11:53 PM BC", text: "Okay CASSIE I've been reading it since around 1210 and I couldn't put it down and just finished chapter 8 💀👀" },
        ] },
        { type: "prose", paras: [
          "You told me you write like it could be turned into a movie. You weren’t exaggerating. I could see every scene.",
        ] },
        { type: "annotations", tabs: [
          { label: "Sprinkles", note: "Black and white, and the real victim of chapter one." },
          { label: "Eliza’s gift", note: "A character who sees emotions as colours. That’s the idea that got me. It’s also why this book is colour-coded." },
          { label: "Desmond", note: "That black aura is creepy as hell. Noted. Moving on quickly." },
          { label: "The scratched-out drawing", note: "The exact moment I was hooked. (Scratched-out things come up again near the end of this book. Just saying.)" },
          { label: "Detective Harris", note: "I still need to know what he found. This is me asking politely. Again." },
          { label: "The twist", note: "You said it gets good at chapter two. You undersold it. You live for a twist, and it shows." },
        ] },
        { type: "shelf", reserved: "Reserved.", spine: "CASSIE", pick: "Staff pick: read it in one sitting, lost sleep, zero regrets. (Corey)" },
        { type: "prose", paras: [
          "You told me your dream is to see your novel on a shelf at Indigo. I’m not a publisher. But I can hold the spot.",
        ] },
      ],
    },

    /* ---------------- VI ---------------- */
    {
      id: "ch6", numeral: "VI", title: "One Week", slug: "one-week", type: "chapter",
      blocks: [
        { type: "prose", paras: ["You said it yourself: it’s been a week. Here it is, in timestamps."] },
        { type: "clock", on: "Ontario", bc: "BC", caption: (on, bc) => `Right now it’s ${on} for me and ${bc} for you.` },
        { type: "timeline", done: "Eight days. Most of them after midnight. Zero regrets.", days: [
          { label: "Day 1 · Nov 17", items: [
            { note: "You messaged me about hating writing research. I had no idea." },
            { who: "corey", at: "Nov 17 · 9:53 PM ON · 7:53 PM BC", text: "I'm happy I added you #writers and #researchfriends 😜" },
          ] },
          { label: "Day 2 · Nov 18", items: [
            { who: "cassie", at: "Nov 18 · 6:13 PM ON · 4:13 PM BC", text: "Because a really interesting amazing girl kept you up until 3 am lol" },
            { who: "cassie", at: "Nov 18 · 11:24 PM ON · 9:24 PM BC", text: "Baseline is boring. 🥱" },
            { who: "cassie", at: "Nov 18 · 11:51 PM ON · 9:51 PM BC", text: "I caught a baseball at a blue jays game!!!!" },
          ] },
          { label: "Day 3 · Nov 19", items: [
            { who: "cassie", at: "Nov 19 · 1:47 AM ON · 11:47 PM BC", text: "Make sure you get some sleep. It's an order. 🙆🏼‍♀️" },
            { who: "corey", at: "Nov 19 · 1:58 AM ON · 11:58 PM BC", text: "You are okay sleep grandma past ur bedtime" },
            { who: "cassie", text: "Grandma?!!!" },
            { who: "corey", at: "Nov 19 · 2:00 AM ON · 12:00 AM BC", text: "Sleeping at 11 is grandma" },
            { who: "cassie", at: "Nov 19 · 9:31 AM ON · 7:31 AM BC", text: "Up at 5:30? Do you even sleep? Lol" },
            { note: "Also the day I wrote you the first poem. (Chapter VIII.)" },
          ] },
          { label: "Day 4 · Nov 20", items: [
            { who: "corey", at: "Nov 20 · 1:53 AM ON · 11:53 PM BC", text: "just finished chapter 8 💀👀" },
            { who: "cassie", at: "Nov 20 · 1:57 PM ON · 11:57 AM BC", text: "looked ahead to the mountains and said something just give me a sign. Anything. Then the album artwork on the song I was listening to had someone holding a pen. Writing." },
            { who: "corey", at: "Nov 20 · 5:20 PM ON · 3:20 PM BC", text: "Shades of cool by Lana" },
            { who: "corey", at: "Nov 20 · 5:23 PM ON · 3:23 PM BC", text: "Okay it's happening 🙂" },
          ] },
          { label: "Day 5 · Nov 21", items: [
            { who: "cassie", at: "Nov 21 · 3:03 AM ON · 1:03 AM BC", text: "HEY. MORE SIGNS. LOL. 💀" },
            { who: "corey", at: "Nov 21 · 3:07 AM ON · 1:07 AM BC", text: "Pretty sure the signier signiest of the signiear double signs is you still being wide awake texting me past midnight instead of sleeping 😜" },
          ] },
          { label: "Day 6 · Nov 22", items: [
            { note: "2:53 AM. I sent you a very long list. (Chapter IX.)" },
          ] },
          { label: "Day 7 · Nov 23", items: [
            { who: "cassie", at: "Nov 23 · 2:08 AM ON · 12:08 AM BC", text: "BLUE RULES. but I'll sway ya 😉" },
            { who: "cassie", at: "Nov 23 · 2:56 PM ON · 12:56 PM BC", text: "absolutely not. Blue forever 💙🩵" },
          ] },
          { label: "Day 8 · Nov 24", sub: "technically still the same week. I’m counting it.", items: [
            { who: "cassie", at: "Nov 24 · 1:36 AM ON · 11:36 PM BC", text: "Are. Those. Foxes" },
            { who: "cassie", at: "Nov 24 · 3:01 AM ON · 1:01 AM BC", text: "I do know - DONT BE WEIRD EAT IT NORMALLY" },
            { who: "cassie", at: "Nov 24 · 3:42 AM ON · 1:42 AM BC", text: "When it comes to you, everything is. 💙" },
            { who: "cassie", at: "Nov 24 · 3:50 AM ON · 1:50 AM BC", text: "Right back at youuuuu my handsome man" },
            { who: "cassie", text: "My little seagull" },
            { who: "corey", text: "Haha I'd be more like a" },
            { who: "corey", text: "With the long legs" },
            { who: "cassie", at: "Nov 24 · 3:51 AM ON · 1:51 AM BC", text: "Flamingo?" },
            { who: "corey", text: "YES" },
            { who: "corey", text: "Spot on" },
          ] },
        ] },
      ],
    },

    /* ---------------- VII ---------------- */
    {
      id: "ch7", numeral: "VII", title: "Signs", slug: "signs", type: "chapter",
      petal: true,
      blocks: [
        { type: "messages", items: [
          { who: "cassie", at: "Nov 24 · 3:30 AM ON · 1:30 AM BC", text: "Saaaaame. I thought signs were something movies made up" },
        ] },
        { type: "prose", paras: [
          "Then the list started. You keep saying it gets longer. You’re right. Here’s the current edition.",
        ] },
        { type: "signDeck",
          counter: (n, total) => `${n} of ${total} signs turned. list keeps getting longer.`,
          tenth: "X. Reserved for whatever happens next.",
          cards: [
            { n: "I", title: "The Mountains", text: "You asked the mountains for a sign. The next thing on your screen was album art of a hand holding a pen. Writing." },
            { n: "II", title: "The Idea", text: "Two years ago I came up with an idea for a book of poems and never found the right person to write it about. Then you messaged me about research." },
            { n: "III", title: "Thirteen Years", text: "Thirteen years as friends on social. Zero conversations that counted. Then, suddenly, all of them." },
            { n: "IV", title: "The Foxes", text: "Your favourite animal is the fox. The only animal anything I own: fox socks. You claimed them in under a minute." },
            { n: "V", title: "The Shuffle", text: "Songs keep landing right on cue. Iris came on out of nowhere after ages of not shuffling in. The universe is showing off." },
            { n: "VI", title: "The Opening Theme", text: "You wanted something about colours, for foreshadowing. Shades of Cool. Then Lana, live, together. Okay, it’s happening." },
            { n: "VII", title: "Quality Time", text: "Asked what matters most, we both landed on the same answer: quality time." },
            { n: "VIII", title: "The Blue Jays", text: "I went to seven Blue Jays games this summer and caught nothing. You caught a ball. Typical." },
            { n: "IX", title: "Wide Awake", text: "The signier signiest of the signiear double signs: still awake, still messaging, long past midnight." },
          ],
        },
      ],
    },

    /* ---------------- VIII ---------------- */
    {
      id: "ch8", numeral: "VIII", title: "The Poetry Drawer", slug: "poetry-drawer", type: "chapter",
      blocks: [
        { type: "prose", paras: [
          "You know I write poems. What you don’t have yet is all of them in one place. So here’s the drawer: three folded pages from the week everything started.",
        ] },
        { type: "drawer", open: "open the drawer", fold: "fold it back", poems: [
          { title: "The Best Part of My Day", date: "Nov 19", tone: "blue", stanzas: [
            ["Even though you’re in BC, the distance barely feels real", "knowing this feeling is mutual, even if it scares you a little", "I like that we are taking our time to learn each other and be sure", "building something steady before we even share the same space."],
            ["You have been lingering in the back of my mind", "a quiet kind of pull I never saw coming", "There is a gravity between us that neither of us planned", "an undeniable spark that even catches you off guard."],
            ["You are sharp, funny and a writer with a mind of your own", "gorgeous in a way that feels completely effortless", "You carry everything about yourself so naturally", "the whole package without even trying."],
            ["Even if I tried to disguise the words", "you would still recognize my voice in the way I describe you", "Some things are just impossible to hide", "especially when the connection feels this real."],
            ["Every conversation feels like turning a new page", "learning the rhythm of who you are bit by bit", "The picture gets clearer every time we talk, Cassie", "and talking to you is easily the best part of my day."],
          ] },
          { title: "Plain Sight", date: "Nov 19", tone: "lavender", stanzas: [
            ["Most people only ever look at the surface", "missing everything underneath", "Thirteen years of scrolling past each other", "just names on a screen living separate lives", "no idea what was actually there."],
            ["You have a depth most people never bother to see", "the kind of mind that actually wakes something up", "after years of static."],
            ["Wild how someone miles away", "sitting right there in plain sight", "ends up feeling like the exact thing", "I have been trying to put into words all along."],
          ] },
          { title: "The Same Page", date: "Nov 20", tone: "ivory", stanzas: [
            ["You looked up at the mountains", "head spinning, asking for a sign", "and the universe didn’t even hesitate."],
            ["A hand holding a pen right there on your screen", "like a quiet reminder of where your words were leading you."],
            ["Funny how a random idea from two years ago", "found its way straight to my mind", "and two people miles apart", "ended up writing on the exact same page."],
            ["You don’t have to keep asking why you", "Some stories just wait around", "until the right person picks up the pen."],
          ] },
        ] },
        { type: "prose", card: true, paras: [
          "These are the first three. The rest are coming, one a day, for a hundred and fifty days. No names in that book. You’ll know.",
        ] },
      ],
    },

    /* ---------------- IX ---------------- */
    {
      id: "ch9", numeral: "IX", title: "The Long List", slug: "long-list", type: "chapter",
      petal: true,
      blocks: [
        { type: "prose", paras: [
          "At 2:53 one morning I sent you a list. It was long. It was also, I realize now, written entirely in one verb.",
        ] },
        { type: "scroll", prefix: "I like", unroll: "unroll", all: "show it all",
          counter: (n) => `${n} things`,
          done: "Every single line starts with “I like.” I’m a poet. I know exactly what I’m doing with that word. I’m choosing it on purpose, for now.",
          items: [
            "the way you write", "your creativity", "how clever you are", "your sense of humor", "your wordplay", "your mind",
            "the way you talk to me", "how easy it is to open up to you", "your honesty", "your vulnerability", "how supportive you are",
            "the way you check in on me", "your strength", "your passion", "how grounded you are", "your warmth", "your energy",
            "how playful you get", "your sarcasm", "the way you tease me", "how you match my banter", "your laugh",
            "the way you scream when something catches you off guard", "how your voice sounds", "your smile", "your eyes",
            "how gorgeous you are", "your confidence", "your self awareness", "how thoughtful you are", "the way you notice little details",
            "how you remember random things I say", "our late night messages", "how natural everything feels with you",
            "the weird coincidences that keep happening around us", "how safe it feels to be real with you", "the way you challenge me",
            "your patience", "how you keep me on my toes", "your passion for your stories", "how expressive you are", "your kindness",
            "the way you look out for my sleep", "how you make me laugh without even trying", "your perspective on life",
            "how refreshing you are", "the tension between us", "how effortless our connection is", "the feeling you give me",
            "the deepness and connection we feel", "just the way you are",
          ],
        },
        { type: "margin", text: "Since then: fox socks, Lego roses, and getting yelled at about pizza. The list keeps getting longer." },
      ],
    },

    /* ---------------- X ---------------- */
    {
      id: "ch10", numeral: "X", title: "No Pressure, Just Real", slug: "no-pressure", type: "chapter",
      reveal: "timed", hold: "hold to turn the page, slowly",
      blocks: [
        { type: "prose", paras: [
          "I know timing is complicated right now. I’m not here to rush a single page of it.",
          "You never have to walk on eggshells with me. Not for a sentence. Not for a second.",
          "Here’s how I do this: I show up. Every day. No games, no half-measures, no guessing where you stand. Just steady care, real loyalty, and a reminder, as often as you need it, of how much you matter.",
          "Good stories don’t get rushed to the ending. They take the pages they need.",
        ] },
        { type: "margin", struck: {
          before: "And no, I’m not going to say ",
          open: "“",
          struck: "what’s meant to be will be",
          close: ".”",
          after: " Too generic. We don’t do generic. I’ll say this instead: what’s real doesn’t need a deadline.",
        } },
        { type: "messages", pinned: true, items: [
          { who: "corey", at: "Nov 19 · 3:00 PM ON · 1:00 PM BC", text: "Also if it didn't scare us a little, it probably wouldn't mean anything or be anything real💜 so it's a good sign 🙂" },
          { who: "cassie", at: "Nov 24 · 2:57 AM ON · 12:57 AM BC", text: "It's crazy. I'm just being myself. Almost without thinking." },
        ], caption: "That’s all this ever needs to be." },
      ],
    },

    /* ---------------- XI ---------------- */
    {
      id: "ch11", numeral: "XI", title: "The Fine Print", slug: "fine-print", type: "chapter",
      subtitle: "terms and conditions of us. please initial each clause.",
      petal: true,
      blocks: [
        { type: "clauses", co: "Co.", ca: "Ca.", button: "initial here",
          done: "Agreement executed. Witnessed by one seagull (allegedly a flamingo).",
          items: [
            { title: "The Pizza Clause.", text: "Pizza shall be eaten normally. First bites taken from the crust purely for the dip are prohibited. The dip may also be used on the actual pizza. (Ref: “DONT BE WEIRD EAT IT NORMALLY,” Nov 24, 3:01 AM.)" },
            { title: "The Gift Clause.", text: "Cassie will never accept a no-gifts rule. Corey has accepted this, under protest, and reserves the right to send Lego roses, because they don’t die." },
            { title: "The Green Thumb Clause.", text: "Real roses may also be issued. If they die too quickly, Corey will judge. Gently." },
            { title: "The Sock Clause.", text: "The fox socks are hereby transferred to Cassie. Corey was informed of the theft in advance." },
            { title: "The Bedtime Clause.", text: "When Cassie says “go to sleep, it’s an order,” Corey will attempt to comply. Whether sleeping at 11 is “grandma” remains under dispute." },
            { title: "The Lana Clause.", text: "One Lana Del Rey concert, attended together. Status: “Okay it’s happening.”" },
            { title: "The Colour Clause.", text: "Blue rules. Purple is also present. Both parties agree to disagree, beautifully, indefinitely." },
            { title: "The Matching Ink Clause.", text: "Any matching tattoo comes in two halves, one each. Neither half makes sense without the other." },
            { title: "The BC Clause.", text: "Corey has never been to BC. Cassie says he neeeeeds to. Mountains to be reviewed in person." },
            { title: "The No-Eggshells Clause.", text: "Neither party walks on eggshells. Honesty, humour and the occasional crossed message at 3 AM are all permitted." },
          ],
        },
      ],
    },

    /* ---------------- author's note ---------------- */
    {
      id: "final", numeral: "", title: "Author’s Note", slug: "authors-note", type: "final",
      epigraph: "“When it comes to you, everything is.” (You, 3:42 AM. I’m just putting it in ink.)",
      greeting: "Cassie,",
      body: [
        "You write books. I write poems. Somehow we ended up in the same story, and I’m still a little amazed by that.",
        "So here’s what I want you to keep, in plain ink:",
        "You are gorgeous, inside and out. Captivating in a way that has nothing to do with trying.",
        "You are a one of one.",
        "And you make me feel like the luckiest reader alive, holding the first chapter of something this good.",
      ],
      scribbleLead: "There’s one more word I could write here.",
      caption: "not yet. some words deserve a chapter of their own.",
      signature: "Corey",
      ps: "P.S. It’s probably 3 AM. Go to sleep. Or message me.",
      blocks: [
        { type: "roseHalves", heading: "Leave your mark", hold: "ink the other half",
          caption: "“You have one half and I have the other.” (Your yes. I’m just holding the pen.)" },
        { type: "signature", label: "sign here, if you want. no pressure, pencil-light.", clear: "clear", keep: "keep" },
        { type: "stamp", keep: "keep this page", kept: "kept", keptLine: (date) => `kept · ${date}` },
      ],
    },

    /* ---------------- epilogue ---------------- */
    {
      id: "epilogue", numeral: "", label: "Epilogue", title: "To Be Continued", slug: "epilogue", type: "epilogue",
      blocks: [
        { type: "prose", paras: [
          "That’s where the book ends for now. Not because the story does.",
          "Your novel is somewhere past page sixty. My poems are on day one of a hundred and fifty. We’re both writers. We know better than to rush the middle.",
          "So this isn’t The End. It’s a page break.",
        ] },
        { type: "buttons", items: [
          { label: "back to the contents", to: "contents" },
          { label: "start again from the cover", to: "cover" },
          { label: "read the pressed flower", to: "pressed-flower", needs: "petals" },
        ] },
      ],
    },

    /* ---------------- unlocked by finding all seven petals ---------------- */
    {
      id: "flower", numeral: "", label: "Unlocked", title: "Pressed Flower", slug: "pressed-flower", type: "flower",
      extra: true,
      blocks: [
        { type: "prose", paras: [
          "Seven petals. Of course you found all of them. You notice the little details. (It’s on the list. Somewhere around line thirty.)",
        ] },
        { type: "buttons", items: [{ label: "back to the contents", to: "contents" }] },
      ],
    },
  ],
};
