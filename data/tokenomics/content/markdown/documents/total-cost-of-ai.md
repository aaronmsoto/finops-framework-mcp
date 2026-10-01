---
author: J.R. Storment
kind: insight
license: CC-BY-4.0
modified: 2026-09-10
slug: total-cost-of-ai
source_url: https://www.tokeneconomics.com/insights/total-cost-of-ai-tca/
status: Podcast episode 17 (TCA is a proposal, not ratified)
status_source: registry
title: Why Tokens Aren’t the AI Bill: Introducing Total Cost of AI (TCA)
word_count: 4755
---

# Why Tokens Aren’t the AI Bill: Introducing Total Cost of AI (TCA)

## Overview {section=overview}

Episode 17·Sep 7, 2026·24 min

J.R. Storment recaps a busy 10-day stretch for the Tokenomics Foundation’s four working groups and proposes a new organizing metric: Total Cost of AI (TCA), arguing that token and API costs are only 10 to 25 percent of total AI spend once energy, capital, infrastructure, software, labor, and process impacts are included.

## Episode summary {section=episode-summary}

J.R. Storment recaps a busy 10-day stretch for the Tokenomics Foundation’s four working groups and proposes a new organizing metric: Total Cost of AI (TCA), arguing that token and API costs are only 10 to 25 percent of total AI spend once energy, capital, infrastructure, software, labor, and process impacts are included.

Other ways to listen Open on Spotify Open on YouTube

Share this episode

## Key takeaways - Measure TCA, focus on Value Realized {section=key-takeaways-measure-tca-focus-on-value-realized}

- Stop reporting the token line as the cost of AI. Assemble the Total Cost of AI: energy, capital, platform, software, licensing, labor, and process change.
- Split labor claims into capacity gain, augmentation, and automation. Each needs a different baseline, and blending them is how ROI cases die in review.
- Value only counts above a quality floor, and a booked claim needs one of five Value destinations: new revenue won, revenue retained, spend removed, spend avoided, or capital freed.

## Episode Highlights {section=episode-highlights}

~25%

Direct model spend is a quarter of the AI bill

An enterprise audit found direct model consumption was only a quarter of total AI spend, with no line item for the rest.

Enterprise audit 00:00

Share

8 personas

Personas map adds a persona no framework had

The Foundation’s new Personas and Operating Model Map adds an AI end user persona, the widest umbrella on the map, because in AI the entire workforce is the end user, not just engineers as it was in cloud.

Personas and Operating Model Map 06:00

Share

Energy per token is a configuration, not a benchmark

The Production Working Group concluded that energy per token depends on where you draw the measurement boundary, so it cannot be compared across providers, only tracked as an internal trend.

Production Working Group 08:00

Share

Report energy per benchmark, not per token

One idea floated in session: run a fixed set of prompts with a quality bar to hit, then measure energy against that fixed task instead of per token.

Production Working Group 09:00

Share

Routing lives inside a gateway, not the reverse

The Consumption Working Group settled a taxonomy: a gateway holds policy, observability, and failover, and routing is one decision function inside it, never the reverse.

Consumption Working Group 11:00

Share

One labor label became three, on purpose

The Value Working Group split the old single labor label into capacity gain, augmentation, and automation, each needing its own baseline, because naming which one you mean is most of an ROI case’s defense.

Value Working Group 15:00

Share

J.R. Storment recaps a busy 10-day stretch for the Tokenomics Foundation’s four working groups and proposes a new organizing metric: Total Cost of AI (TCA), arguing that token and API costs are only 10 to 25 percent of total AI spend once energy, capital, infrastructure, software, labor, and process impacts are included.

He connects each group’s work to AI unit economics as TCA over realized, finance-defensible value delivered above a quality floor. Definitions updated AI tokenomics to emphasize measurable business value and released a personas and RACI operating model map. Production debated where to meter energy per token, boundary choices, and benchmarking ideas. Consumption clarified proxy, router, and gateway taxonomy, routing to meet quality bars at the lowest cost, and cache metrics. Value drafted a value architecture, categorizing outcomes and mapping booked destinations like new revenue won, revenue retained, spend removed or avoided, and capital freed, plus key upcoming events and takeaways.

Referenced from the show: Tokenomics Events (tokeneconomics.com/events), Tokenomics Personas and Operating Model Map, Release Candidate (tokeneconomics.com/personas-and-operating-model-map), and Tokenomics Working Groups (tokeneconomics.com/about/tokenomics-working-groups).

### 02:00 The Total Cost of AI Proposal

Four working groups, 10 days, and a new number that everyone is talking around. In one enterprise data audit, direct model and token consumption itself was only a quarter of total AI spend, the rest of the AI bill driving much of the cost. So today, we give you the complete spend through a new name, the Total Cost of AI, or TCA Hello from San Diego, where we are tracking currently three hurricanes out over the Pacific Ocean, and the waves were pumping all weekend.

Welcome to the Tokenomics Brief. I’m J.R. Storment, Executive Director of the Tokenomics Foundation here at the Linux Foundation. And Happy Labor Day to everyone here in the US. If you’re spending part of the long weekend with me, welcome. You are my people. Today is a working group roundup because the last 10 days have been one of the busiest stretches since we formed the Tokenomics Foundation about 47 days ago.

All four working, working groups met this last 10 days: the Definitions Working Group, the Production Working Group, the Consumption Working Group, and the Value Working Group. I’m gonna lay out the four recaps of what they covered side by side, and you’ll see a single idea start to come into focus. So today, I’ll walk you through not only what they shipped, but a proposed new metric buried in one of the whitepapers that I think sits at the core of all of this Let me start with a proposal.

Because every working group update in this episode connects back to it, it’s probably the right place to go from. Every earlier era of technology cost management eventually landed on a total. Data centers had TCO, cloud had the fully loaded bill. The pattern was always the same. The obvious consumption-based line item turns out to be a fraction of the real number, and the discipline matures once someone starts looking at the entire thing.

AI is at that moment right now. Most of the market is staring incorrectly at token costs and the API costs associated with them, but the real bill includes energy, it includes capital, silicon, data centers, routers and gateways and observability software and licensing, and critically, the, the labor to build and review and supervise all that AI, and of course then the impacts on the business processes.

That audit I mentioned in the opening put direct model consumption costs, the token costs, at roughly a quarter of total AI spend. And we’re hearing this from all angles right now. Tokens carry somewhere between a tenth and a quarter of total run cost. The total line from tokens is not the bill. So here’s the proposal.

Everybody knows from this space the acronym TCO, and after watching AI teams this year, you might be forgiven for thinking that TCO stands for tokens, caffeine, and outputs. But in reality, it stands for total cost of ownership, and it’s a number that has taught the IT finance and ITFM folks and the data center folks and the historic cloud era even now to count the whole bill, including labor, not just the variable consumption costs.

And AI needs its own version. So let’s call that the total cost of AI, or TCA. TCA is the numerator of AI unit economics. Everything you convert into AI capability, the full input side, and the denominator is realized value. Not tokens produced, not requests served. Measurable realized business value counted only when the output from that clears a quality bar.

### 04:00 Definitions: The Sentence and the Map

TCA over value delivered. That is the ratio of AI unit economics, and I would argue is the single number that this discipline exists to improve upon The term is already in the wild quietly. It snuck its way into our new white paper on personas, aligning engineering ownership of the platform layer and talking about the total cost of AI there.

But today I’m proposing we promote it from a line in a white paper to an organizing metric of this practice. The four working groups are all coming together to build different portions of the total cost of AI unit economics story, and let me walk you through how. The first working group is the definitions working group, and they own the language.

The definition of AI tokenomics moved to zero point five point two. Yes, we’re being that specific about it, and it is now live on tokeneconomics.com. I want to read it exactly as it’s published. AI tokenomics, also known as AI economics, is the discipline of converting energy and capital into AI capabilities and efficiently consuming that intelligence across the organization to realize measurable business value Period.

A few things changed since the last version. The sentence now ends firmly on value instead of trailing off into cost, and the verb is realize, realized value, the opposite of value promised and never actually booked. The object of this work also got a name. We landed in this version on the AI capabilities.

The unit production converts into AI capabilities, and consumption consumes AI capabilities. And the consumption working group runs across the organization end to end. That sentence is TCA over value as an equation in prose form. If you convert energy and capital, the numerator, you realize measurable business value, the denominator, it all comes together into what we’re all trying to collectively accomplish.

The group also shipped a new paper into the project section of the website called the Personas and Operating Model Map. This is a release candidate. Go read the actual whitepaper that sits there, and it talks about who makes the decisions about AI in the organization. It lays out eight different personas.

There is a capacity persona. It’s the function that secures power landed hardware years, years before, in some cases, it’s actually consumed. It also added a new AI end user persona, which is the widest umbrella on the map, and it’s a new one from previous work that the Linux Foundation has done in this area because the AI end user consumer is, in fact, the entire workforce.

It’s not just engineers as it was in cloud. In that whitepaper, there’s a full RACI, which breaks down by life cycle stage, walks through accountability, responsibility for the different parts of this. But I would give one caution on RACI models. We’ve seen this before in previous work in FinOps and ITAM and other areas in ITFM.

### 07:00 Production: Where Does the Meter Sit

You need to treat RACIs as a starting place, not a prescription. Who’s responsible and who is accountable for different parts of work is going to depend on your organization and the maturity of your existing practices, and whether you have things like ITAM or MLOps or platform engineering or dedicated FinOps, or it’s integrated with ITFM and how all that works.

So look at this RACI as a map to get you started, but it is not a prescriptive answer. You need to figure out the answer for yourself. This whitepaper is a release candidate, so go take eyes on it or put eyes on it, read it, argue with it, and tell us where you think it needs to change Getting to the production working group, they had their third session this last week, and the group is focusing right now on the physical end of the numerator.

They spent this session focused on a simple question: When you measure energy per token, where does that meter sit? If you move the meter from the GPU edge all the way over to the data center front door, the number starts to change. The denominator also moves, which is why total cost and realized value are so important.

Because if we look at speculative, say, decoding, that can burn a lot of tokens that you’re ultimately gonna throw away. And the further out you go, you start to hit the grid, you start to hit water, you start to hit the embodied energy for the hardware itself, and this changes what you can influence. So there is a decision to be made about whether you’re reporting totals or total influenceable numbers as part of this.

One of the things discussed in that working group is that energy per token is a property of the serving configuration, it’s not necessarily a benchmark. That is to say, your configuration is going to be unique and that it’s really challenging to do cross-provider or cross-company comparisons that look at a mix of energy and providers and first and third party inputs.

So you want to keep the storyline that you deliver to finance in the end very clear, and it needs to clearly specify whether it’s just touching on equipment, whether we’re talking about the raw energy, whether we’re going to the front door of the data center, or if we’re stopping at maybe the hardware just in cloud.

This is a TCA question, the total cost of AI that we opened with. The numerator of TCA only means something once you declare that boundary, and the group in the production working group is leaning toward documenting how to make the call of defining the boundary versus trying to pretend there is a single boundary for everyone.

The group also revised the bottom of the five-layer tokenomics stack. Rack density now lives with power and cooling. Regions and availability zones also got reframed as mechanisms for the availability that you actually want. And the stack now starts from landed silicon. That is the hardware as it arrives in a data center.

They did end up leaving chip design below that spine. One idea from the session that stands out: instead of energy per token, you can run a fixed series of prompts with scores to meet and report energy per benchmark, benchmarking within your specific boundary It is early, and there’s not a standard energy benchmark out there that we know of yet.

### 10:00 Consumption: The Decision Layer

Um, but you can start to get a sense of this idea that if you have a fixed task that you need to accomplish and that task scores at a level that meets a quality bar, and you measure the energy against the work that clears that bar, you can start to get a sense of your total consumption within that production layer.

You see how these things start to blur together. And the two groups, both the production group and the value group, both converged this week on the idea of quality floors, which are minimum lines that we will accept work above. So let’s talk about the consumption group in the middle of these for a minute.

If you heard our routing episode, the last one I did, uh, this is gonna pick up roughly where that episode left off. Each week in a working group, Steven Arthur brings in a definition of the week, and this definition of the week was actually model routing, quite fittingly. And the definition went something like this: Model routing is about directing each request to the model or serving path that meets the task’s quality bar, there it is again, at the lowest cost.

The second half of that sentence is doing the structural work. The router answers the cost quest- question against a quality bar that is set somewhere else. The router does not define the bar. The router enforces the quality floor. That working group in this last week also settled across or on a taxonomy that has been a, been a bit muddy for years, a language taxonomy, and this was about proxies, gateways, and routers.

They said a proxy is transparent pass-through, which sets rate limits and retries. A router is the decision layer. And yes, routing is, in fact, model selection. It includes model selection, and, and personally, I’ve actually been splitting those out, so it’s interesting they landed there. They’re saying a gateway houses all of this, plus it includes org-level policy, observability, and failover.

They clarified that you can add routing to a gateway, but you do not add a gateway to a router because that containment, that hierarchy, uh, only really runs in the one direction. They said the gateway is the control plane, and routing is one decision function inside of that. So a router that grows policy, observability, and failover has not been extended.

It’s actually become a gateway Early responses to the state of tokenomics data keep saying routing is already in the enterprise. In fact, we saw eighty-five percent of companies are using or evaluating routers in that early data. We also saw high correlations between those who are using routing, a signal of maturity, and those who can connect AI spend total cost of AI to outcomes realized value that a CFO will accept.

This is correlation, of course, not causation, but there are some cautionary tales around this. Sometimes model routing can actually result in damage to customer retention by sending requests to cheaper models that deliver lower quality outputs. A couple other things from that consumption working group session.

On cache metrics, they talked about how a bounded hit ratio beat an unbounded reuse ratio because bounded metrics compose across teams, and a number in the hundreds of thousands of percent really means nothing to a human. We talked about this early on in the FinOps materials about the laws of large numbers and how when they get too big, humans struggle to comprehend them.

And routing can break caching because provider caches are machine local, and that machine might be sitting on your desk, or it might be sitting in a data center, it might be sitting in the cloud. But both ends of the stack are shipping fixes to the same problem at the same time. The group is also debating adding a sixth layer to the five-layer stack, and this one is for clients and entry points, which is the application layer where consumers of AI actually live.

### 14:00 Value: The Denominator Gets Its Architecture

The room is leaning toward a yes, but knowing this community is working very iteratively, it might land on six, seven, or even eight layers over time. So let’s talk about value, the value working group, and this is where I’m going to spend a little more time. This is the denominator of total cost of AI, TCA.

And the group this week in their summary, which is not yet published but will be shortly, laid out the clearest piece of architecture for value that the foundation has yet put together The draft walks through five different steps, and I’m not gonna go through all five of these on this podcast. I’m gonna focus on the last two 'cause that’s where value moves from being kinda like a vibey, claimy thing to being bookable in a finance perspective.

So step four of those five steps was classification of value. They took classification of value and broke it into 10 categories that were grouped into three groupings. Okay, so sounds complicated, but let me break it down. Group one, these were about direct dollar wins. They looked at revenue enablement.

They looked at cost avoidance. These are numbers that are already in a ledger or already on an invoice trail somewhere. So the argument was that it’s really just about attribution of those numbers. It’s not trying to figure out how to measure them. The second group was, ba-dum-bump, labor. Labor is a big category, and the group realized they needed to break it down further than they had before.

So what used to be a single label, labor, is now three individual pieces within that. First, labor as capacity gain, or rather capacity gain from your labor. That is the same people are producing more. Second was labor augmentation. That is AI is doing part of the task and the human continues to stay in the loop.

And the third was later labor automation. That is the AI does the task end to end. Augmentation is measured against the human alone, whereas automation needs the best of either baseline and a quality gate, and it starts to raise the question of who owns the decision once the human is out of the loop.

Group three, after labor, was about reported outcomes. These are major categories of AI value, and they’re often the one the business cares most about. Product quality here was renamed from output quality because what matters really is not the output of the AI, but the improvement of the product that the business actually ships.

They also looked at speed to market, where cycle time is easy to measure, and the worth of shipping a feature earlier, a week or a month or otherwise, ultimately resolves into revenue which can be pulled forward or spend that is avoided. They also looked at risk reduction, and that is if an incident that never happens or an outage is avoided or they can catch a compliance failure early, how does that impact the business?

And the math there got pretty compelling. They also looked at new capabilities, and this is personally my favorite one in, uh, AI outcomes or AI realized value because new capabilities start to unlock something that wasn’t possible before, and that’s really the power of AI today, doing things you couldn’t do before.

There was a tenth category, a candidate category they put out as well that they’re still discussing called employee engagement, and this gets into retention of employees and morale. But these are things that are often hard to quantify into a dollar figure. So while the group decided this was an important area to look at, they haven’t yet, uh, codified it into a tenth category.

One more line from that fourth step. Remember, I’m going through five steps in a, in a value chain, and this one is aimed directly at executives. They talked about capacity gain and new capabilities routinely carrying more weight for executives than cost avoidance, right? I mean, if you’re an executive, you want to deliver new things, new capabilities, have more outputs, and that is often more valuable than just shaving some costs or reducing some waste.

However, they mentioned that this is often one that’s hard to quantify. The ROI case often focuses on cost avoidance or efficiency because when it gets down to an FTE estimate or a new outcome that you didn’t have before, there’s not a clear counterfactual against which to measure that, and the ROI story gets complicated.

So something to focus in there as you look at your own practice. Okay, value. Going back, we had five steps. I’m gonna look at step five now. Step five is where booked numbers from a finance perspective land, and in step five, they talk about the destinations. Where in the financial statements do those booked numbers land?

The ones they landed on was the first is new revenue won. Can we quantify that and land that as a booked number of new revenue won? The second was revenue retained. The third was spend removed. The fourth was spend avoided. And the fifth, my personal favorite, capital freed. Again, capital that we can go use potentially to unlock new capabilities.

So the discipline in step five is what it refuses to allow. That is step five, where the numbers are booked, is a very precise allocation. Capacity that is freed and never redeployed is not necessarily a sixth destination. It is a tracked FTE estimate, and it becomes spend removed or a new revenue won the quarter after that somebody’s able to act upon.

So there are a bunch of corner cases that they discussed of where this is hard, and the best example they gave was that if you have a company-wide AI assistant that is saving everybody thirty minutes a day, and we know this is happening just from looking around with our eyes, sometimes that never re- really resolves into a place of booked numbers where that can land, and the quant- the ROI of that is hard to quantify.

So the, the framework that they’re putting together laid this out as a delta in productivity with nowhere to land in the booked numbers. So if we put these steps together, that’s step four, uh, which is the outcomes, and the step five, which is where the numbers land, we get the denominator of TCA, the total cost of AI.

And everything in the numerator, from labor to infrastructure to data to software licensing, business processes, these are all now matched against a denominator with a real architecture underneath it. What the AI produced, in which category, converted how, landed where in the books. This is what measurable business value means when you have to defend it to a CFO So let’s step back and look across these working groups and see what is the picture that’s emerging?

Well, the Definitions Working Group wrote a new sentence about what tokenomics is. The Production Working Group is instrumenting from the input side the details down to where the energy meter sits. Is it inside the data center, inside the cloud, or outside the building? The Value Working Group, uh, is building the architecture that makes the denominator in that equation bookable, and the Consumption Working Group is building the decision layer that spins the numerator efficiently against a quality bar, a minimum required quality set.

So the four working groups are all in different parts of the same equation, and that equation, I think, is total cost of AI, TCA, over realized bookable value delivered. The full bill on top, the total cost of AI, over the defensible finance-ready outcomes below. So consider TCA, the total cost of AI, formally proposed by me.

I’m gonna bring it back to the working group. Let’s take that apart, help us figure out where the boundaries are, figure out if that’s the right one, and this is what working out in the open enables us to do, have these conversations. So three announcements before I give you three takeaways. First one, September 23rd, State of Tokenomics is landing live in Amsterdam.

It’s also gonna be live streamed into a Zoom summit simulcast in front of a live studio audience in Amsterdam. Please consider joining that 7:00 AM Pacific, 10:00 AM Eastern, 4:00 PM CEST. October 20th, San Francisco, this is gonna be the first Tokenomics 100 for members of the Tokenomics Foundation and a small set of local invited guests.

These are the deep practitioners building, training, and refining tokenomics in the organizations alongside the Tokenomics Foundation governing board. And December 8th, the first New York Executive Tokenomics Summit happening at One World Trade Center built for CIO and CFO leaders, specifically those at SVP, EVP, and above.

So if your executives are asking these value questions that we covered, might wanna consider nominating them for that room. All this is available on tokeneconomics.com. Okay, so the three takeaways to leave you with. First off, one- Stop reporting token line, the token costs as the total cost of AI. Start assembling your total cost of AI that includes the energy and the capital and the platform and the software, the licensing, the labor, and the processes around this.

Because if tokens are a quarter of the real number, a token-only report is off by at least 4X even before you start talking about value. Two, split your labor claims up when you’re doing CFO ROI. Split out capacity gain, augmentation of labor, automation of labor. These are different baselines, and blending them together makes ROI cases unclear, so say which one you’re talking about.

And three, value really only counts against a quality floor, and a booked value claim needs a destination in the ledger. Five areas you might explore: new revenue won, revenue retained, spend removed, spend avoided, or capital freed. If your value claim cannot name its category, its conversion, and its landing spot, it’s gonna struggle to pass that bar.

Okay. Well, that’s gonna do it for today’s Tokenomics Brief. Happy Labor Day again to those in countries celebrating that. If today was useful, please share this episode with your colleagues or friends. Hit the like button, the subscribe button, the follow button, whatever platform you’re on. I’m J.R. Storment.

Let’s go realize some value.
