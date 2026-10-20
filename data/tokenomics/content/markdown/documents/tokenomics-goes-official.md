---
author: J.R. Storment
kind: insight
license: CC-BY-4.0
modified: 2026-08-26
slug: tokenomics-goes-official
source_url: https://www.tokeneconomics.com/insights/tokenomics-not-counting-tokens/
status: Podcast episode 15
status_source: registry
title: Podcast #15 of Tokenomics Brief: Tokenomics Goes Official: Defining AI Economics, Value, Routing Layers & the Per-Watt Economy
word_count: 5963
---

# Podcast #15 of Tokenomics Brief: Tokenomics Goes Official: Defining AI Economics, Value, Routing Layers & the Per-Watt Economy

## Overview {section=overview}

Insight

J.R. Storment

Aug 19, 2026

KEY INSIGHT

Tokenomics is not about counting tokens

Only about **a quarter** of a platform’s AI spend is typically direct model consumption. The rest is GPU, infrastructure, memory, database, compute and the labour around all of it — so a cost model that stops at the token line item misses roughly three quarters of the bill, and the value formula built on top of it is wrong.

##### Listen on Spotify or watch on YouTube.

## Summary {section=summary}

The Tokenomics Foundation has moved from announcement to institution. The governing board held its first meeting, the technical steering committee stood up behind it, and the value, consumption and definitions working groups all met for the first time, with production following a day later. The board meets quarterly, works by consensus and owns vision, strategy and budget. The technical steering committee owns ratifying the technical work, including the definition of tokenomics itself.

That definition is staying in draft on purpose. J.R. Storment expects it to change “50 times over the coming years” and treats that as a feature: take strong positions early, in the open, and keep revising as the industry teaches you. What the founding-member onboarding calls produced was less a definition than a diagnosis — the parable of the blind men and the elephant. Hardware people described tokens per watt, finance people described attribution and unit costs, engineers described caching and routing, product people described pricing and margins, and CFOs tried to connect it all on the balance sheet. Everyone was touching something real. Nobody described the whole animal.

The closest thing to consensus was relating cost to outputs, and there was one near-unanimous exclusion: tokenomics is not about counting tokens. The number behind that stance is the sharpest figure in the episode. An audit of those conversations found that only about a quarter of a platform’s AI spend is typically direct model consumption. Stop at the token line item and you are looking at the tip of the iceberg.

The value working group went straight at the hardest question — measuring “before AI” rather than “after AI”, summing both sides, and counting labour on both sides as augmentation rather than headcount reduction. It agreed a set of value categories ranked along a quantifiability gradient: revenue enablement, cost avoidance, capacity gain, labour offsets, output quality, speed to market, risk reduction, and net new capabilities. It also produced the first complete measurement method the foundation has seen — deflection — and immediately found the hole in it. Processes that did not exist before AI have no baseline and no counterfactual, so a framework that only handles deflection looks complete while missing the harder half.

The consumption group has already shipped drafts: the five-layer tokenomics stack and Adobe’s Big T notation, a riff on Big O applied to token consumption complexity. The definitions group spent its time on energy, and that is where the episode lands. Every supply-side conversation Storment has had — neoclouds, data centre providers, GPU, CPU and TPU providers — is converging on metrics with “watt” in them: revenue per watt, token output per watt, and intelligence per watt as proposed by the Agentic AI Foundation. FinOps was built on the premise that capacity could always be procured. Tokenomics cannot assume that, because power runs out first.

Three market stories close the episode, and they read as one pattern: the layers that decide where a request goes, and what power it consumes, are becoming financial infrastructure. Stripe acquired OpenRouter for $7 billion, having already bought metering and billing. SpaceX closed its Cursor acquisition, putting a consumption layer in front of gigawatt-scale compute. And a SpaceX earnings report split out its AI segment and quoted a specific revenue-per-watt figure — the metric leaving the working group and entering public financial reporting. MIT and NYU joined as academic members, and Harvard Business School’s AI Institute landed on a three-word playbook: route, pilot, govern.

## Key takeaways {section=key-takeaways}

- **Every value claim needs a named baseline.** Before AI versus after AI, both sides summed, humans included on both sides. If an AI story cannot name its counterfactual, it is not an ROI story yet.
- **The routing layer is financial engineering infrastructure now.** A payments company paying $7 billion for a token router, on top of buying metering and billing, makes token cost management a first-class financial function. Plan the architecture as though the router is a critical cost centre.
- **Cost per call beats cost per token.** Token prices do not tell an operator what a single processed invoice or auto-remediated alert costs, and they ignore the human time deflected.
- **Labour belongs in the cost equation, as capacity rather than headcount.** The room was careful with the language: augmentation, not cuts.
- **Deflection has a baseline problem.** For mature processes the right comparison is the marginal cost of already-optimised, sometimes offshored work, not a fully loaded salary. And once agents absorb the easy cases, only hard ones reach humans and throughput metrics invert.
- **There is a quality floor.** A model that is 90% cheaper but misses the quality bar a workload requires is not cheaper. It is unusable for that workload.
- **The watt is becoming the denominator of the supply side.** Revenue per watt, tokens per watt, intelligence per watt. A full episode on the per-watt economy is coming.
- **Nobody confused tokenomics with crypto.** Across dozens of member onboardings, not once.

Auto-generated captions, lightly corrected and paragraphed. Speaker throughout is J.R. Storment.

**0:00** The Tokenomics Foundation officially formed these last two weeks. Stripe is reportedly paying $7 billion for the routing layer that we covered a few episodes back. And the foundation working groups just met for the first time to start drawing the map of the discipline. These are the headlines.

### Part one: the foundation goes official

**0:16** Part one, the foundation goes official. Let’s start with the house news. The Tokenomics Foundation was officially formed over the last two weeks. The governing board had held its first meeting a couple weeks back, technical steering committee stood up last week behind it, and this week working groups formed with members.

**0:34** Quick word on how this thing runs, because governance is our strategy here at the Linux Foundation. The board meets quarterly and works by consensus, and they own vision, strategy and budget. On the other side of the house, there’s a technical steering committee that owns ratifying the technical work, including the definition of tokenomics itself.

**0:54** And the definition is staying deliberately in draft for now. A lot of board members, and myself included, are expecting that we will learn things that change the definition 50 times over the coming years. And that’s kind of a feature of what we’re doing. We’re building this out in the open, taking strong stances early on, but also recognising that we don’t have all the right answers initially, so we can keep revising it as the industry teaches us.

**1:20** So one of the things I’ve been sitting with are the onboarding calls that I did leading up to our governing board meetings, our tech steering committee meetings, with a bunch of the founding members. And there’s some common patterns across those that fit with that old parable of the blind men and the elephant, where everybody is touching something real when they’re walking up to this thing. And everybody’s describing it a certain way, but nobody’s really able to describe the whole animal. And the definitions that everyone are offering are predictable for their point of view, from where they’re sitting.

**1:46** For example, hardware people are talking about tokens per watt. Finance people are talking about attribution and unit costs. Engineers are talking about caching and routing. And then you got the product folks who are talking about pricing and margins and business models. And then the CFOs who are trying to connect it all together on the balance sheet. So the closest thing to consensus that we’ve gotten to in all these conversations around definition is something around relating cost to outputs.

**2:21** There was one near unanimous exclusion to the definition conversations, and that was a unanimous message that we are not counting tokens. Tokenomics is not about counting tokens.

**2:34** One of the audits of those conversations that I’ve been reviewing shared that only about a quarter of a platform’s AI spend is typically direct model consumption, on average. The rest is GPU, supporting infrastructure, memory, database, compute, and of course all of the services and labour around supporting those. So if you’re only looking at tokens, or even counting costs per token, you’re really missing typically three quarters of the total bill, sometimes more.

**3:07** Most of the rooms I sat in the last few weeks were also aligned around the idea that education and training needed to come first, ahead of nearly everything else. Benchmarking — perennial request in the years I’ve been doing foundation work — came up in a lot of conversations, but the current posture on our end is that the foundation really should do the work around defining the metrics that matter to benchmarking, and who actually runs benchmarking and stores that sensitive data is an open question.

**3:31** Hosting open source code projects is also something the Tokenomics Foundation is being set up to do. Our charter allows it, and the boards are exploring the right time to begin taking in external projects.

**3:47** Couple dates to get on your calendar right now. This Thursday we are hosting at 8 a.m. the — what month is it? — August summit. That is a Tech Value Summit, in collaboration with the FinOps Foundation, Tokenomics Foundation and the ITAM Forum, along with the FOCUS spec. We’re going to dig in around how those disciplines fit together, and myself and Stephen Arthur from the Tokenomics Foundation are going to spend some time digging into what we’re hearing definitionally and otherwise around tokenomics, and what it isn’t.

**4:17** We’re also going to be launching the industry’s first vendor-neutral benchmark. Nope, not benchmark — used the one word that I said I wasn’t going to use. We’re going to be launching our industry’s first neutral survey of the tokenomics space. This is going to be neutral data around what tokenomics is, what the challenges are, what the definitions are, and what you’re all seeing, collected from generally Fortune 500 sized companies, that we can all build a foundation — small case f in that case — around.

### Part two: the working groups

**4:48** So let’s talk a little bit about the working groups that happened over the last five or six days. There were three working groups, three sessions, another one starting tomorrow. Value, consumption and definitions all kicked off this week. The production working group actually starts tomorrow. We’re going to talk a little bit through what each of them hit on, under a Chatham House approach here.

**5:04** Let’s start with the value one first, because that one went straight to one of the hardest questions in AI economics. As a side note, I do believe AI economics is probably the best shorthand synonym for tokenomics. AI economics is tokenomics.

**5:19** And this group, the value group’s framing was about what “before AI” looks like instead of what “after AI” looks like when you’re measuring value. And that you need to sum everything on both sides, including critically people. Labour costs going in and labour costs going out. Labour is a critical part of the AI cost equation.

**5:44** And the room was very careful about the language, because people are treated as augmentation in this model, not headcount cuts. The conversation wasn’t about using less labour or changing labour plans — although I think that is an elephant in many rooms right now. But this echoes what Sonali Niswander at MetLife shared in episode 1, in our keynotes at the new Tokenomicon at FinOps X, about how they are looking to have some of the same labour doing more. The labour conversation is really more about capacity, not necessarily headcount.

**6:19** I do believe there are also a lot of conversations about headcount, headcount planning before AI and after AI, that are going to need to come into the value conversation. So we’re going to look to see where that group goes.

**6:27** The group also agreed on a set of value categories. And those categories, because again we’re not counting tokens, were looking at value outputs. Things like revenue enablement, cost avoidance, capacity gain, labour offsets, output quality, speed to market, risk reduction, and net new capabilities — capabilities as in those things which your organisation could do that it couldn’t do before.

**6:59** They ran these along a quantifiability gradient, which is how well they could be measured. And the closer the value sits to the deliberate outcome, the easier it is to measure. The further away, the harder. So there’s some interesting mapping and graphing of that happening in that group.

**7:15** And some of those founding conversations this last week also produced the first complete measurement method that had been put on the table in our group. And that is a measurement around deflection — that is from an agentic aspect. Count the share of work an agent has completed with no human in the loop. Price the human labour it has displaced, that is the human did not need to get involved with that task, and use the cost to serve per event as the denominator, which is the whole bill, not just the model line.

**7:48** Now the challenge here is the baseline for mature processes. The best comparison for that total cost is not a fully loaded salary. It’s actually the marginal cost of work that has already been optimised, and even in some cases offshored to lower cost areas.

**8:03** And so there is a productivity paradox hiding inside of this. That is, once agents absorb the easy use cases, only the hard ones reach humans, and the traditional throughput metrics quietly flip over. They invert.

**8:20** So thinking around outputs of value in terms of deflection of human time — delegation would maybe be another way to say that — is an interesting way to put it, because deflection also assumes that work existed, though that’s really only half the story. The other part of that, the unsolved part, is for processes that did not exist before AI there is no baseline. There is no counterfactual, as someone in the group said. It’s a good word, counterfactual. I believe that means there’s nothing to compare it against.

**8:44** One of the conversations in that founding one put it as the idea that when you have a backlog of 140 forms that nobody was ever going to build, that backlog cost you nothing, and automating them cost you more than nothing. So if you go from not doing the backlog to doing the backlog, you suddenly have cost. So there is a sort of value output judgment, and a risk for value output judgment there, not just a savings calculation.

**9:08** So a value framework that only handles deflection will look complete while it’s actually missing the harder part, which is whether we would have done the work, and what the human time involved would have been to do that. We just don’t have a baseline against which to measure it.

**9:31** So the consumption working group was another working group that kicked off. This one has already started to ship some early drafts of materials. If you go to the Tokenomics Foundation website, tokeneconomics.com, you’ll see the five layer tokenomics stack — the five layer cake from earlier, episode 10 in this podcast — is now live on the website in a draft form.

**9:52** Also live on the website is the Big T notation. This was donated by Adobe. It’s a framework for classifying token consumption complexity. It is sort of a riff on Big O from computer science, applied to tokens and token complexity, or consumption of how many of those tokens that you need.

**10:11** It looks at a basic formula of T of n for simple calls, T of n times k when tools and retrieval multiply the work, and T of n times k times a when agents start spawning agents. I knew that was going to be confusing to read and to hear in this format, so please go look at the doc and have a play with the ideas and the concepts there. It’s not a true defensible algorithmic formula, but it is a directional way for you to classify workloads based on their complexity.

**10:41** The first working group review of that document, however, surfaced some practical considerations. First, context optimisation and shrinking of the n in that formula is the biggest lever that most teams will pull first. Several of the members reported that they needed to build a knowledge base for deploying agents, dramatically reducing reasoning overhead in enterprise settings. But that of course required human labour time to build. If you feed those agents a map instead of making it wander around, they become more efficient.

**11:12** So while blended token cost — because remember, we’re not really counting tokens, and we might be considering a blended cost of tokens — that metric, which we talked about in episode 9, is going to move accordingly if you’re doing some of this early work around context engineering.

**11:28** The definitions working group also started this week, and this was probably one of the richest debates of the three working groups. The session started where it should, around what is tokenomics.

**11:42** The draft definition the foundation put out informally focused on converting energy and capital into AI, consuming that AI efficiently to enable intelligence, and using that intelligence to drive outcomes and business value. That is meant to be broad and fairly vague. But if you see that definition, it does represent the structure of the working groups. We’re looking at production of AI, consumption of AI, and value from AI.

**12:03** So just as useful as naming what tokenomics is, it was also useful to name what tokenomics is not. One of the members in there described sitting on three different calls in a single day with three different people, three different companies, and hearing three different things. This is the blind men and the elephant parable through another lens. One call it was all about model routing. Another was about cost dashboarding, and another was about token volumes. All of those things roll up into the discipline, but none of them really is the discipline itself.

**12:36** Tokenomics, as we’ve heard from all the interviews, covers all AI costs. It’s not just tokens. The tokens, while they are an atomic unit and they align through lots of layers of the stack, as I talked about in the keynote back in June — the supporting infrastructure like networking and storage, hardware and memory, and the labour to build and run it all is a massive part of the costs. So if your definition stops at the token line item, you’re looking at just the tip of the total cost iceberg, which means your value formula is going to be all hosed.

**13:05** So related, we also are hearing a lot that per token pricing is the wrong altitude for most decisions. The clearest ask from the conversations in these founding working groups is to look to cost per call or cost per event metrics, because token prices do not tell an operator of AI what a single processed invoice or an auto-remediated alert costs, and it certainly doesn’t consider the deflected human time and costs involved with that.

**13:36** And for the record, across all these conversations — multiple dozen new member onboardings — nobody confused any of this tokenomics stuff with crypto. Not once.

**13:45** Energy is in the definition that the Tokenomics Foundation launched ahead of the formation, and that’s where the conversation really caught fire. One of the members asked a question around whether we even needed energy and capital in the definition now. And the earlier cost disciplines around cloud, particularly FinOps, those things never really looked at that area, even while the hyperscalers who were delivering cloud were out there pouring concrete and mass into data centres and fuelling those with power.

**14:17** But the core assumptions have flipped. In the FinOps world it was built on the premise that capacity simply needed to be purchased or procured — if you need more, you just simply autoscale. Tokenomics does not assume that. Tokenomics touches over far left into that production bucket all the way to the hardware and the inputs to the hardware. Training clusters from tens or hundreds of thousands of GPUs at scale dictate large amounts of capacity placement, and the energy needs around those can’t be discounted. Even if you’re just running in cloud, the energy is not always available. Energy costs affect total costs, and inference is getting layered on top into these training runs across those clusters to smooth out peaks and valleys in utilisation.

**15:00** Available GPUs, allocated GPUs, GPUs that are actually being deployed — or CPUs or TPUs — are part of this equation that make your, we’re going to get to in a minute, your tokens per watt, your revenue per watt or your intelligence per watt highly variable.

**15:18** Another member mentioned this idea that second order effects like energy and memory shortages have actually bubbled up into the top of these conversations, and ignoring them in the definition might make more confusion, or have a higher cost, than making an energy-involved definition slightly more complicated.

**15:40** So here’s some of the pattern behind why I believe, anyway, that energy needs to be in that definition. Every supply side conversation that I have had over these last few months — neoclouds, with infrastructure providers, with data centre providers, with GPU providers, CPU providers, TPU providers, even those doing heavy agentic workloads at scale — are converging around some metrics that all include the watt word.

**16:04** They’re looking at revenue per watt from the data centre. They’re looking at token outputs per watt — again an inelegant metric, but one that is being considered. And look at our friends at the Agentic AI Foundation: Mazen there has proposed intelligence per watt. So the watt is really becoming the denominator of the entire supply side business, and the Tokenomics Foundation is also leaning into that, because we believe we need to stand up working groups and have inputs from all the adjacent areas in the entire ecosystem, and other foundations that are touching on these metrics of intelligence per watt and outcomes per token, or outcomes per watt.

**16:38** So we’ve introduced the idea of revenue per watt in some of our evaluations we’re going to talk about in a minute. We see this in the industry from folks like SemiAnalysis and those who are looking at hardware benchmarks, and we’re going to devote an entire upcoming episode to the per watt economy, including with some interviews that I am collecting right now. So consider this the trailer for that episode.

**17:03** Two more things from the definition room. There was a concept brought up about the quality floor. That is, that no matter how cheap a model gets, no matter how well it is priced, there is a defined quality bar for any workload. This also gets a bit to Big T and aligning workload complexity. So if the model does not hit that quality bar — and the model has reduced its cost by 75%, or even one tenth, or whatever, 90% — it doesn’t hit the point of actually being able to use that model. There’s always this value conversation.

**17:32** And there was a bit of a wrestle in there about who owns AI cost management, tokenomics, whatever part of that we’re talking about in the organisation. Several of the members are saying it really needs to be in engineering. We’re hearing some of those folks say they are engineering, and there’s a separate group in their teams on the AI side that are taking it. And others seeing dedicated tokenomics teams, some seeing it sitting in FinOps. It’s all over the board.

**17:57** So we do see, as with all things, we want to keep the discipline, the data, the discussions close to where the spend is being incurred, so there’s a feedback loop. The risk becomes, on the other side of that though, if it is sitting that close to engineering, is a fragmented cost picture, because engineers typically don’t see the whole cost equation. They see the cost or the usage for the thing they’re using.

**18:22** Tokenomics is not just about tokens. It’s certainly not even just about the cost of the AI. We need a unified view of all spend and labour and all the things that we’ve heard about for years — our friends in IT finance and ITFM and all of those related areas.

### Part three: the headlines

**18:30** So that gets us to part three, some headlines. There are three quick headlines I want to hit this week and they’re pretty interesting. They’re a little tangential, but stick with me.

**18:44** So, first big one. TechCrunch reported, as a lot of folks did, that Stripe did officially acquire OpenRouter for $7 billion. OpenRouter was the organisation that I put a screenshot of, to growing token counts, in my initial keynote about tokenomics. They do some great work around aligning all these different models and providing different views of this, and what we call almost the router economy, tongue in cheek.

**19:00** So we’ve got a payments company that’s buying a token routing layer. That payments company, Stripe, has also recently bought metering and billing through things like Metronome. Now they’re looking at routing of tokens, converging around charging. And this is a whole financial engineering infrastructure that’s coming into play. The routing and the routers themselves are not just a developer convenience anymore. It’s a toll booth, one in which decisions need to be made and revenue is deeply tied to. And Stripe apparently agrees with this.

**19:30** So second, SpaceX. I’m going to talk about them twice. Sorry for those that don’t like Elon — this isn’t about that, but some of this is relevant. SpaceX officially closed its Cursor acquisition. Now, Cursor came up constantly in my early interviews about tokenomics in May and June of this year, and several enterprises talked to me during that research period, without sharing private details, but they mentioned that they are negotiating deals with Cursor and companies like that.

**20:00** And the commentary there is fascinating, because we’re seeing how important tools like Cursor, as well as the other coding tools — and Cursor does take a bit of a different approach than say Codex or Claude Code, won’t get too much into that in this podcast. But the pattern here is what matters. We’ve got a company like SpaceX that’s focused on compute at a gigawatt scale, massive part of what they’re doing if you read below the headlines of all the space stuff, and they’re now buying a consumption layer that drives demand for that compute. So the thread I’m drawing through here is obviously this is not about consumption value; there’s a production side on the far left.

**20:33** And that brings me to the third headline, which also relates to SpaceX, but it’s one of the most fascinating views I’ve seen in headlines the last few weeks about tokenomics. And it was buried actually in a SpaceX earnings report that came out, where they split out their AI segments separately. And this is interesting because these compute businesses, particularly AI compute businesses, have been unusually hard to isolate from earnings reports, and this one is unusually easy to isolate.

**20:58** They showed — and I won’t get into the details because this isn’t financial advice — but they showed specific revenue line items showing, in the hundreds of millions of dollars, how revenue went from one number up to a different number in the billions, quarter over quarter. And they quoted this attached to their total gigawatts. So they annualised that and they gave a specific revenue per watt number, and they showed that revenue per watt. Revenue per watt. Sound familiar? Tokenomics metric.

**21:26** They saw that revenue per watt jumping from roughly one number to another number that was a lot bigger. Again, I’m not quoting the numbers because this is not financial advice. But they also talked about growth of capacity. So we’ve got capacity metrics around watts, we’ve got outputs, all coming together. And they use that to basically draw a line to where their revenue, based on their watts, based essentially on production from GPUs and related things into intelligence into value, increases. And this wasn’t just presumably plugging in more GPUs; if you read between the lines, it probably also had to do with allocating capacity to more buyers.

**22:06** So remember that revenue per watt metric. I’ve had so many conversations the last few weeks about it with many other companies. We’re going to keep tracking that metric, as I think we’re going to see it appearing in more public company earnings reports.

### Part four: the academics

**22:14** Part four. Let’s get out of money and talk about the academics. This last week was cool. We had both MIT and NYU, New York University, join the Tokenomics Foundation as academic members. They both have some really interesting professors and others doing deep research in this area, and we’re actually going to be looking to try and feature some of these academics and their academic papers in some of the research, and bring them into the working groups to get that true pure academic view into this.

**22:45** Definitely recommend checking out some of the pieces — we’ll post them as part of the show notes. There’s also some interesting parts coming out right now around industrial organisational psychology and all the rigorous ways that we’ve been trying to measure human productivity for decades. Stripe, who we just mentioned, put out a post around this — or sorry, that was Block rather, put out the post around intelligence and hierarchy. And this is academic research into that same thing about how do we measure the human value of AI labour changes in the organisation.

**23:09** There were three pieces. One by Dell’Acqua and colleagues about cybernetic teammates — fascinating one, where they actually did comparisons and meta analysis across hundreds of other experiments to look at how teammates versus tools interacted alongside human teams, when those teammates are actually agents. They as well got into naming why the value chain needs to have a baseline.

**23:35** There was another paper from Agentforce looking at AI agents as workforce members alongside the organisation side, and how teams actually adopt agents rather than how vendors are hoping they will.

**23:43** And one of the other interesting papers that came out — and I’m not doing these justice, so go read them yourself, I’m just hitting the highlights from them — was one more from the practitioner side. The Harvard Business School’s AI Institute put out a paper around this area as well, and focused around tokenomics recommendations in their August memo, and they landed on a three-word playbook. They said you need to route, and then pilot, and then govern.

**24:07** Some of this sounds really similar to frameworks we’re familiar with in other parts of the Linux Foundation. Routing is important so that cheaper models can catch the routine work, and more complex work rather gets more expensive models. Piloting is of course an important thing to look at, in terms of things like open weight models and high volume, low sensitivity workloads, and measuring those against your frontier lab incumbents. And governing, of course, with a simple policy model to classify things by data sensitivity, provide some governance around people using these.

**24:44** Simple ideas are making their way into some of the largest academic organisations in the world, and I’m super excited to see folks like MIT, NYU and Harvard Business School playing in this tokenomics area.

### Closing takeaways

**24:53** So with that, it’s been a long episode, so I’m going to leave you with a couple takeaways. The first one that I thought was really interesting from the definition working group is that labour — this was their top takeaway from the summary I saw — labour belongs in the cost equation of tokenomics, and every value claim that one makes or equates or calculates needs to have a named baseline. You need a before versus after. What was the before AI scenario versus the after AI scenario? You need to sum both sides, and you need to include the humans on both sides of that. Because if your AI story cannot name its counterfactual, that is the thing to compare itself against, it is not really an ROI story yet.

**25:35** Second takeaway, the routing layer is becoming critical financial engineering infrastructure. When you see a payments giant like Stripe spend $7 billion for a token routing company, as well as buying metering and related areas, making management of token costs a first class financial function — you got to start planning your architecture like the router is a critical cost centre and service that you need. We’re not saying you need to go buy that from them; there’s lots of places to buy it from, you can also build your own. But it’s something to consider as a critical function.

**26:04** And the third thing is, go read the working group outputs that are starting already within the Tokenomics Foundation. That five layer stack, which started from Ambud Sharma at Pinterest, is published in a draft form. There’s the Big T notation, started with Dan Nef at Adobe. Those are live on the site. There’s a new intersection article of how tokenomics is intersecting with other existing cost and cloud disciplines, and a companion podcast. And we’re going to be announcing the first tokenomics survey at our summit this Thursday at 8 a.m. Pacific.

**26:41** So that is going to do it for today’s daily brief. Coming soon, as I mentioned, going to do a full episode on the per watt economy — revenue per watt, tokens per watt, and why the supply side is already treating energy and watts as part of the critical denominator in the tokenomics equation.

**26:58** If today’s episode was useful, please share it with someone on your team who’s wrestling with some of the same questions. Hit that like or subscribe or follow button on whatever platform you’re on so you get these automatically.

**27:09** And two things to do. Join us this Thursday 8 a.m., that is August 20th, on the summit for the tokenomics, FinOps, ITAM and FOCUS intersections. And of course register for Amsterdam, September 23rd: Amsterdam Tokenomicon and FinOps X, where all of this is coming together in person. Links for both those are in the show notes. I’m J.R. Storment. I will see you next time on the Tokenomics Brief.

Never miss an episode

The Tokenomics Brief lands every week, breaking down AI economics as the discipline forms. Follow it on Spotify or YouTube and each new episode arrives the day it drops.
