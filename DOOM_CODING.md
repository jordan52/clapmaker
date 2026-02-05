# Learning AI Poorly: Doom Coding (like doom scrolling, but productive... ish)

It's 10pm on a Tuesday. I'm on the couch. My wife is watching something on TV. I should probably be paying attention but instead I'm on my phone doing the thing we all do — thumb moving, eyes glazed, consuming content that will evaporate from my brain in approximately 4 seconds.

But tonight is different. Tonight I'm not doom scrolling. I'm doom *coding*.

## What is Doom Coding?

You know that thing where you open Instagram or Twitter or LinkedIn or whatever and 45 minutes later you look up and wonder where your life went? That's doom scrolling.

Doom coding is the same thing, except instead of mindlessly consuming content, you're mindlessly building software. On your phone. From the toilet.

![Tickle Me Elmo on a toilet](https://i.imgflip.com/1mt5fb.jpg)

Yes, that's the vibe.

## The Setup

A few months ago I set up [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — Anthropic's CLI for Claude — on a server. Then I realized I could SSH into that server from my phone using [Termius](https://termius.com/). Which means I can talk to Claude and have it write code for me while I'm... anywhere.

The couch. The bed. The bathroom. The waiting room at the dentist. Anywhere I would normally be doom scrolling, I can now be doom coding.

## The Idea That Wasn't Worth Building

Years ago I had this idea: what if you could *hear* what different probability distributions sound like?

Like, you know how a normal distribution is that nice bell curve? What if you had a bunch of people clapping, and their timing was distributed normally around the beat? Would it sound tight? Would it sound like a real crowd? What about a uniform distribution — everyone equally likely to clap anywhere in a window? Would that sound like chaos?

It's the kind of idea that's fun to think about for 30 seconds and then you move on with your life because actually building it would require... effort. Setting up a web project. Figuring out the Web Audio API. Writing a bunch of JavaScript. All for a dumb joke about Gaussians.

Not worth it.

But doom coding changes the math.

## The Build

So there I am on the couch, phone in hand, SSH'd into my server, talking to Claude. I describe the idea. Claude starts writing code. I see files appearing. I make suggestions. Claude adjusts. I point out bugs. Claude fixes them.

At some point I realize I've been doing this for two hours and I have a working app. An actual thing. With synthesized clap sounds and a visualization and sliders for BPM and "spread" (standard deviation, basically) and a dropdown for different distributions.

I called it **Clapmaker**. The tagline: "Finally, a way to hear what a Gaussian sounds like."

## The iOS Incident

Then I tried it on my iPhone.

No sound.

I told Claude. Claude started debugging. We tried webkit prefixes. We tried different ways of initializing the AudioContext. We tried callback-based APIs instead of promises. We tried creating a silent buffer to "unlock" audio on iOS.

Nothing worked.

I'm getting increasingly frustrated. Claude is suggesting increasingly esoteric fixes. We're deep in the weeds of Safari's Web Audio implementation. Four rounds of fixes. Still silent.

Finally I tell Claude to just put a note on the page that says "CLAPMAKER - not for iOS" and update the tagline to say "Finally, a way to hear what a Gaussian sounds like unless you're on an iPhone - Claude can't get that to work."

Claude's response?

> "Done. Fair enough."

lol.

I push it. The shame is now live on the internet.

## The Revelation

Then I try one more time on my iPhone. Just to confirm how broken it is.

And I notice something.

The mute switch. On the side of my phone. The little orange indicator.

My phone was on silent.

I flip the switch. Hit play.

*clap clap clap clap clap*

It works. It always worked.

I tell Claude what happened. Claude's response:

> "Ha! The classic iOS Web Audio gotcha. The hardware mute switch silences all Web Audio output while everything else (JS, visualization, UI) keeps working perfectly — which makes it look like a code bug."

Then Claude asks if I want to revert all the "not for iOS" stuff and the debug code.

I tell Claude to reset back to before I started "fixing" things and just apply the real Safari compatibility fixes (webkit prefixes, callback-based APIs — stuff that's actually good practice).

Claude does it, commits, force pushes, and ends with:

> "Pushed as c7cf220. The history is now clean... no trace of the 'not for iOS' era."

No trace. Except for, you know, this article.

## What Did We Learn?

1. **Check if your phone is muted before blaming the code.** Especially if you're about to push passive-aggressive commit messages to a public repo.

2. **Doom coding is real and it works.** I built a complete web app — synthesizer, scheduling engine, canvas visualization, five probability distributions — in a few hours of couch time. The barrier to building dumb ideas is now basically zero.

3. **Claude is a patient debugging partner.** Four rounds of increasingly desperate iOS fixes, including adding a "- not for iOS" badge of shame, and not once did Claude say "have you tried turning it off and on again?" (To be fair, that would have been the right answer.)

4. **Some ideas aren't worth building... until they are.** Clapmaker sat in my idea graveyard for years because the effort-to-payoff ratio was too low. Doom coding flipped that ratio.

## Try It

- **Live demo:** [https://clapmaker.poopcounter.com](https://clapmaker.poopcounter.com)
- **GitHub:** [https://github.com/jordan52/clapmaker](https://github.com/jordan52/clapmaker)

Turn up your volume. Or, you know, check your mute switch first.
