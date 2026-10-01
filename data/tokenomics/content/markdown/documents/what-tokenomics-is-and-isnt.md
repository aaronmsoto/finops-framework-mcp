---
kind: insight
license: CC-BY-4.0
modified: 2026-08-19
slug: what-tokenomics-is-and-isnt
source_url: https://www.tokeneconomics.com/what-tokenomics-is-and-what-it-isnt/
status: Member-call synthesis (unlisted page)
status_source: registry
title: What Tokenomics Is, and What It Isn't
word_count: 7367
---

# What Tokenomics Is, and What It Isn't

## Overview {section=overview}

Tokeneconomics Foundation | Member research synthesis

Synthesized from fifteen member onboarding and pre-governing-board conversations, July 2026. All quotes are verbatim from transcripts and deliberately unattributed.

## Executive summary {section=executive-summary}

Fifteen conversations produced broad agreement on how wide the scope is, and almost no agreement on where to go deep. That is the whole finding.

1. **It is not counting tokens.** The one near-unanimous exclusion. Supporting evidence offered: an audit of one platform's own AI spend found only about a quarter was direct model consumption. The rest was GPU and supporting infrastructure.
2. **The closest thing to a shared definition is "relating cost to output."** Nine distinct definitional shapes were offered, and they are predictable by where the speaker sits: hardware talks tokens per watt, finance talks attribution and unit cost, engineering talks caching and routing, product talks pricing and margin.
3. **The three-zone map draws directly contradictory advice.** One member said pick one lane and create gravity within twelve months. Another rejected picking lanes at all and pushed the model into a loop. Both are credible. Both cannot be followed.
4. **How this relates to adjacent practice is unresolved.** The sharpest objection heard was that this is existing discipline with a new vocabulary. It was partly conceded once the new levers, personas, and buyer evidence were laid out, and partly not. Several boundary tests were proposed in individual conversations, but no single line survived contact with all fifteen.
5. **Culture was deliberately left out** of the draft definition, on the reasoning that the cultural layer already exists in adjacent practice and does not need restating here.
6. **Value was the weakest-understood zone until one conversation supplied a concrete method.** Measure **deflection**, the share of work an agent completed with no human in the loop, then price the human hour it displaced. The catch is the baseline: if cost to serve exceeds what the same task already costs an offshore team, there is no return.
7. **Deflection only covers half the ground.** A separate conversation argued that much of the interesting AI spend has **no baseline at all**, because the work was never being done. Those cases are a risk-for-dollars judgement, not a savings calculation, and the two members never heard each other.
8. **Per-token pricing is the wrong altitude for decisions.** The clearest new ask is a cost-per-call or cost-per-event metric, because input, output, cache, and reasoning token prices do not tell an operator what one processed invoice or one auto-remediated alert costs.
9. **Nobody confused tokenomics with crypto.** Zero times in fifteen calls. The internal name worry did not materialize with members.

The bottom line

Almost nobody defines tokenomics as counting tokens, but almost everybody defines it differently. The open question is not whether the scope is broad. It is **where to go deep first**, and whether the pieces can be separated at all. That is a governing board decision, not a research problem.

## The elephant problem {section=the-elephant}

The most repeated framing across the calls was the parable of blind men describing an elephant. Everyone is touching something real. Nobody has the whole animal.

They're all kind of right, but they're also all not seeing the whole picture, and that's very much what I'm running into as I talk to different people, some in hardware, some in software, some at the frontier model layer, some in agent world. They're all describing it differently.

Somebody will be like, tokenomics, it's just about counting tokens. And somebody else says tokenomics, it's about how AI costs impact business value. It's all over the board.

The pattern is predictable by where the speaker sits:

| Vantage point | How tokenomics gets defined |
| --- | --- |
| Hardware, data center, neocloud | Token throughput per watt. How much intelligence can I manufacture from the energy and capital I have? |
| Hyperscaler and model platform | Buy, manage, optimize. Procurement, credits, terms, observability, model portability. |
| Enterprise finance | Relating cost to output. Attribution, unit cost, budgeting, forecasting, capitalization. |
| Enterprise engineering | Caching, routing, context, quantization, model selection. The configuration levers. |
| Business and product leadership | Pricing models, monetization, labor substitution, margin impact. |
| Solution providers and analysts | An operating discipline for cost, quality, and value visibility, enough to govern it. |
| Global systems integrators | Wherever AI costs money. Scope follows cost incidence rather than any layer of the stack. |
| Enterprise platform and operations | Model fit per workload, quota governance and capacity, and cost to serve. Value measured as work deflected away from humans. |
| Academia | A ratio. Value created over resources consumed, evaluated at multiple resolutions. |

## What tokenomics is: the definitions on offer {section=what-it-is}

Seven distinct definitional shapes appeared. They are not mutually exclusive, but they imply very different first deliverables.

1. Cost related to output

The most common formulation, and the closest thing to consensus. Not cost alone, and not value alone, but the relation between them.

Relating cost to output. I think at the end, that's the big thing.

2. A ratio, at multiple resolutions

Value divided by resources consumed, computed at whatever altitude you care about: a token, a sentence, an answer, a workflow, a job, a role, a department.

It doesn't matter what it is, it's a value, just definition of value, and divided by the resources you put into it.

Tokenomics to me is economics at different levels. It depends on what level you're concerned with. No matter which level you're looking at, we need to start with the bottom, which is one single token.

This framing is the only one offered that actively reconciles the other six. It treats the competing definitions as different resolutions of the same ratio.

3. Constrained optimization, not cost minimization

Your organization's Pareto frontier, not the generic benchmark published with every model release.

The economic side of it is the constraint solving, like the Pareto optimal frontier for my problem. Not for somebody else's problem, not for the generic benchmark I see every time a new model is released.

If you're a bank there's constraints, and they're non-negotiable. So you can't drive cost to zero.

4. A token supply chain, from first principles

Treat the token as a manufactured good and ask for its bill of materials.

Almost like from first principles, what did it take to produce the token? What am I paying for? What are my options for producing one? I can buy them from someone. I can generate them. I can create them from scratch.

It's no different than how much energy do my factories need, or how much food, how many rations, how much ammunition does every squad need? This is the supply chain for the AI era.

5. Effective work per unit of energy

The production-side view, framed as an efficiency and even a national-competitiveness question.

What is the most effective work you can produce per token? And that is different per company. It's different per country.

It won't be who can build the most data centers. It'll be who can be most effective with what energy they have available.

6. An operating discipline for visibility and governance

The services and practitioner framing: five questions and two lenses.

Effectively just an operating discipline for making AI cost, quality, and value visibility enough to govern it.

The five questions as stated: what is the AI usage creating, what is driving the usage, what does that usage cost, which usage is actually worth the cost, and what decision needs to be made to improve it. The two lenses: financial defensibility and decision quality.

7. Cost-conscious AI, end to end

The broadest version, refusing every layer boundary on purpose.

To me, honestly, all that matters is end to end cost conscious AI, cost conscious agents, different workloads, training, cost conscious inference.

For me, the other layers, hardware, data center management, virtualization management layer, all of that matters to me.

9. Wherever AI costs money

The tightest formulation offered, and the only one that defines scope by cost incidence rather than by layer or discipline.

My take is the tokenomics plays where AI costs money. Because the question is, should I be spending that money?

It has a useful side effect. Asked whether tokenomics is about developer productivity or about AI embedded in products, this speaker rejected the framing outright: *"Why is this a question? Why is this even a question?"* If the test is cost incidence, both are in scope and the debate dissolves.

If you do tokenomics with other stuff below the waterline, then you don't have the I in ROI.

8. Model fit, governance, and cost to serve

The most operationally specific definition offered, from a large software operator running AI in production. Three parts, in order.

Tokenomics to me is, how do we ensure that we got the right models and tuning for the right workload? Number two is how are we doing the governance in terms of quotas? Number three is then cost to serve, for all of this.

Governance here means deliberate entitlement, not caps: *"It should just not be carte blanche, this everybody gets the same."* Capacity is part of it, and it is a make-or-rent question: own GPUs, rented GPU instances, or an inference endpoint. Cost to serve is explicitly the whole bill of materials, not the model line.

For cost to serve includes also your Kubernetes clusters, because for you to build all the harness and all the tools you need to run the skills, there is compute cluster also, and then your typical block storage. That is not that expensive compared to the LLM gateway cost. But yeah, the cost to serve is everything.

One deliberate boundary: *"Infrastructure only. We're not burdening as of now people cost."*

## The three-zone map, and the fight about it {section=three-zones}

The working map presented in most calls has three zones. It is the most tested artifact in the set, and the reaction to it is the single most useful signal in these transcripts.

**Production**

Converting energy, capital, and hardware into tokens. Data centers, power, cooling, silicon, hardware selection, hardware-level cache offload, self-hosted and open-weights inference.

**Consumption**

The familiar territory. Allocation, attribution, forecasting, budgeting, unit economics, routing, caching, context, prompt and model efficiency, guardrails.

**Value**

Business model and pricing impact, monetization, ROI, labor substitution, agentic labor accounting, margin, capitalization. Newest addition: deflection rate, cost to serve per event, and the labor baseline you measure against.

### How members reacted to it

- **Value first.** Several put the value zone first, explicitly as differentiation from market noise. One ranked the three "value, consumption, production, in that order."
- **You cannot pick lanes.** One member rejected the linear structure outright and pushed for a triangle or circle: *"If I have production and consumption, but I'm not able to show the value, then to me it's not linear. It's a triangle."* Another said flatly you have to do all three.
- **You must pick a lane.** The exact opposite advice, from a platform vendor: *"If you pick too many lanes and you don't have the impact early, then people are like, oh, this is just another comet in the sky. There are lots of comets. You have to create gravity."*
- **Production and consumption are inseparable.** A different objection: *"You have lots of decisions to make on consumption based on what you assume about production."*
- **Draw the line anyway.** The internal rebuttal: *"You can push things together and pull them apart. So you do just need to draw a line. We drew a line through this for the sake of making it simple to understand, not because it doesn't go together."*

Unresolved

"Pick one lane and create gravity" and "you cannot separate the three" are both credible strategic advice from serious members, and they point in opposite directions. This is the first real decision the governing board owes an answer to.

### A sharper cut at the production boundary

One member drew a line inside the production zone rather than around it, and it is the most precise boundary anyone offered.

There's a lot of production that isn't tokenomics. Capacity planning, engineering, deployment, token routing decisions, policy decisions. Those have an aspect of cost, but they also have an aspect of data sovereignty, and security aspects, and compliance aspects.

Tokenomics is not the only voice in the routing room. Tokenomics is not even much of a voice in the capacity planning room. But I think they are a major voice in the chargeback aspect. How do we recover and bill for these tokens internally?

Read that way, the Foundation's strongest claim on the left of the map is not capacity or deployment. It is the internal pricing of self-produced tokens, which is already familiar territory: shared costs, markup, and the decision about whether to pass savings through.

### Five control surfaces, and not all of them have ever been managed before

The same conversation supplied a second axis the three-zone map does not capture: **who holds the control point**. Five were named as currently tracked, with the expectation that the count grows.

1. **Direct API**, managed through token routers.
2. **Desktop**, which needs device management tooling rather than cloud tooling.
3. **Cloud-brokered** model access.
4. **Agentic tooling**, which introduces behaviours none of the above have.
5. **Pass-through consumption inside software you already buy**, sold on a consumption basis with non-deterministic usage patterns.

The fifth is the uncomfortable one, because the lever sits with a vendor you do not hold the model contract with.

The point made was blunt: for pass-through consumption the control surface moves to the software vendor selling you the seat, not to the hyperscaler or the model provider whose contract you actually hold.

It is very unlike what FinOps has done in the past, if they have to concern themselves with desktop configs.

## Measuring value: the first concrete method offered {section=measuring-value}

For most of these conversations, value was the zone everyone agreed mattered and nobody could operationalize. One conversation supplied an end-to-end method. It is recorded here in detail because it is the only complete proposal in the set, and because it changes what the value zone should contain.

### Deflection as the primitive

The unit is not usage and not savings. It is the share of work an agent completed with no human in the loop.

What we want is, how much did this deflect? How many tasks or incidents that were supposed to be handled by a human got deflected? Deflected is basically 100 percent autonomous in execution.

If you are an SRE person, how many of the alerts were handled directly by the agents? So it got deflected. You saved that value. Or if you are an accounts payable team, how many of your invoices were self-approved, you don't have to get involved.

### The productivity paradox it creates

Once agents absorb the easy cases, human throughput metrics invert and become actively misleading.

The productivity of employees needs to be measured differently, because only the harder cases are now going to the employees. You can't use the traditional metric of number of tickets or alerts managed by an SRE, or invoices supported.

There is a worse case, and it is the one that will show up in the data first:

Those cases were supposed to be deflected by AI, but they are not, and hence the customer is extremely pissed. And now you have to handle that. So even from a value perspective, you can't just say, okay, my productivity has dropped.

### The ROI anchor, and an uncomfortable baseline

Cost to serve becomes the denominator, and the comparison is to whatever the process already costs today. That is a much harder bar than it first sounds.

This particular task is deflected by AI. That could have taken three hours of a human employee. Compared to that, what's my cost to serve? If my cost to serve for that deflected task is higher than an outsourced somewhere in Costa Rica or Eastern Europe, then I'm not generating an ROI.

Worth sitting with: the benchmark is not a fully loaded domestic salary. It is the marginal cost of a process that has already been optimized and offshored. The internal response was to push on the baseline question directly, asking whether the comparison is human replaced or human plus AI, and noting that the already-automated processes with formulaic playbooks are exactly the ones that lend themselves to agentic enablement in the first place.

### What is easy to measure, and the surprise about what is hard

Easy, because they already have quantitative baselines and documented playbooks: back office, accounts receivable and payable, support, SRE, supply chain, and anything previously sent to a low-cost location.

Hardest, stated flatly:

Developer productivity, which is more of a copilot thing, this is the most difficult one, at least in my head.

A direct contradiction

An earlier conversation argued the Foundation should tackle **developer productivity first because it is the easier problem**. This conversation says developer productivity is the **hardest** thing in the value zone, and that back-office process work is where measurable returns actually are. Both speakers were reasoning from real programs. The sequencing question is genuinely open.

### Cost saved and cost avoided are not the finish line

The real goal is not cost saving and cost avoided. What did it generate? Is it more coffee break for employees, or do you really do something valuable out of that?

And a warning about instrumenting this badly:

If you give a target to people, then they will achieve the target. It's really the process. Do you see more innovation, new products launched, or customer sat improved eventually, rather than just these tickets?

### Intangibles stay intangible, but they get a proxy

The value from that is, okay, you avoided a big catastrophe. That's an intangible, because we don't know what would have happened. But it helped you not have a human get involved.

The proposed workaround is to categorize the difficulty of the event and price the human time it would have taken, rather than trying to value the averted outcome.

### The cases with no baseline at all

The deflection method assumes displaced work. An earlier conversation argued that a large share of the interesting AI spend has no baseline, because the work was never being done, and that this is where most of the demand actually sits.

I've got 140 forms in my backlog that I'd like to see if I can get agentic development to work on. There's no savings in that. Those forms sitting in your backlog are costing you nothing. If you do something about them, they will cost you more than nothing.

The problem is, it's not what would it have cost you to do them. It's that you would not have done them. They would stay free.

The clearest example given was an agent reading outbound email for data loss:

It is something a human would have done if they could do it at scale. Humans didn't do it at scale. Humans didn't do it at all.

So the decision is not a savings calculation. It is a judgement about whether the spend is worth the risk it retires, and it can go either way:

If that agent costs millions of dollars a month, which it could, they might make a determination that from a risk perspective their preexisting deterministic tooling is good enough, and not do it. That's an economic decision.

The two methods are not reconciled

Deflection prices displaced human time. Net-new work has no human time to price, so it needs a risk-and-value judgement instead. These came from two different conversations five days apart, and neither speaker heard the other. A value framework that only handles deflection will look complete and quietly miss the harder half.

### Productivity gains do not reliably reach the bottom line

A separate caution, and it cuts against labor-avoidance math from the opposite direction to the offshore baseline.

There was one report that said they got an 80 or 90 percent productivity improvement at a call center, but were only able to lay off 15 of the people. There's a gap between the productivity and the actual bottom line effect.

You cut 90 of 100 people, and you still need 100 people, because they all did different jobs.

The residual time does not automatically become value: *"people are more effective at what they do now, and it gives them more time to go to the water cooler."* Which loops back to the same question the framework keeps returning to, whether the freed capacity went to work that was worth doing.

### There is no single ROI method

It is not in a way broad brush. It's for every domain, every function, there is a different treatment of your ROI.

The shape of a value framework, as it now stands

- **Deflection rate** per process, defined as fully autonomous completion.
- **Cost to serve per event**, including gateway, orchestration cluster, and storage, not just model tokens.
- **Displaced human time** priced at a defensible baseline, which for mature processes is the offshore marginal cost.
- **A difficulty categorization** so that averted incidents get a proxy value instead of a guess.
- **Revised human productivity metrics** that account for the residual work being harder than the average was.
- **Outcome checks beyond cost**: innovation, new products launched, customer satisfaction.
- **A per-domain treatment**, not one formula.

## What tokenomics is not {section=what-it-isnt}

### Not counting tokens

This is the one near-unanimous exclusion. The strongest supporting data point offered: an audit of one platform's own AI spend found only about 25 percent was direct model consumption. The other roughly 75 percent was GPU and supporting infrastructure.

This isn't about counting tokens. Anybody can count tokens, and counting tokens isn't even really relevant, because tokens have such a different set of values and costs and outputs and inputs.

I am seeing an increasing number of people who think, oh, I can count tokens, I'm done. Everybody and their mother's got some kind of token something.

### Not a fork of FinOps, and not built on the FinOps framework

We are starting fresh in the sense that we do intend to tap some of that. But right now we're not touching any of it. We're starting with blank canvas.

One member endorsed this on grounds of intellectual humility: *"The temptation is always to keep close what's familiar. To your detriment in this case, because the ground's moving. But you need the humility coming in to know that you know nothing."*

### Not a cultural discipline

Culture was deliberately excluded from the draft definition. The reasoning: the collaborative, data-driven, accountability-based cultural practice already exists in FinOps and serves as the substrate.

It is a substrate. It is the foundation that guides the practice of tokenomics.

There's technical and economic, and the FinOps aspect is the cultural element. So I think it will coexist.

### Not cost minimization

It's not just drive the cost to zero. At all.

And not "more output" either. Outputs were repeatedly distinguished from outcomes: *"Your engineers will be sitting there running agents writing code all day long around bad ideas, and that's just burning cost and not actually driving value."* Also flagged: *"Do I have people just trying to get on a leaderboard to show how much AI they are using and producing zero value?"*

### Not blanket spend caps

I don't think everything is equal. I might have some developers working on a really complex program, and they might need a lot more tokens than somebody working on something much more simple. Having a generalized hard limit for everybody is not it. I think we can do more math than that.

### Not something you ask humans to optimize per interaction

The cognitive-load objection came up in three separate calls. Tool defaults return users to their last model, and nobody re-derives the cost-optimal choice each time.

We're not going to sit down and think every single time I do something, am I using the most cost-effective model?

How do we know where to be sending this thing, and what best practices could we put in place so that I don't have to think about everything I do? It just magically happens.

### Not a settled unit of account, and not the right altitude for decisions

A token is not a token. Providers tokenize differently, output token types are not distinguished in most billing data, and a cheap per-token model can be more expensive in practice.

Cost per token looks great, but it consumes twice the tokens.

Most of the billing data we look at doesn't differentiate output tokens. It just says output tokens. Was it an image, was it text? Was it reasoning tokens? That's not in there a lot of the time.

Tokens can be made by a letter, a phrase, or a whole sentence. It's just hard to abstract and explain and sell to somebody. And it's inconsistent.

The sharpest version of this is that even a perfect per-token number answers the wrong question. Operators reason in events, not tokens.

As of now it's cost per input token, cost per output token, cost per cache token. But it is not per hit that you make. I have an invoice to process. The metric needs to be per LLM hit, small or long. What is my cost to serve?

This input output token is too detailed. It's not up-leveling to an event that occurred, be it an alert that got auto-remediated.

The worked example: an observability platform raises an alert on a cluster, an agent is invoked, it calls other agents through the harness, and something gets auto-remediated. Every one of those hops carries cost, and none of it is legible as a per-token line.

### Not a place where cloud cost instincts transfer

The economics are inverted in ways that will catch experienced practitioners. In compute, commitments buy you a discount and capacity is generally there for the asking. In AI, commitments buy you certainty and you pay a premium for it.

If you were to buy compute, typically compute is available, so we don't do reservations. Compared to your on-demand list price, your net effective cost is about 50 percent off. Whereas in the case of AI, if you were to do pay as you go versus provisioned throughput, it is about 1.4 times more expensive by doing provisioned throughput, because your capacity is not guaranteed.

Three more reversals from the same conversation:

- **Free things stop being free.** Cache reads were not charged, and then at a certain model generation they were. Described as *"a sneaky way of pleasing the customer."*
- **Newer models are chattier, not cheaper.** *"The models are getting chattier, especially the large models. For the same input tokens, the output tokens and thinking tokens are 4x. And the prices are higher."*
- **Owning capacity does not mean using it.** Average utilization on owned GPUs is *"going to be really poor"* because data residency fragments the fleet and the workloads are spiky, unlike traditional enterprise compute.

### Not one ROI method for every domain

Explicitly rejected as a single formula. Different functions need different treatments, and the easiest domains to measure are the ones that were already industrialized.

### Not product building

Stated non-goals for the Foundation itself: it will not build model routing or intelligence layers, and it will not publish model benchmark scores. The stated alternative is to supply standardized metrics so members can benchmark their own workloads. This one is now under pressure, because a member asked directly for cost-to-serve benchmarks by workload archetype, then reconsidered mid-sentence and suggested partnering with an existing benchmark provider instead. The neutrality problem was raised immediately: a benchmark provider that gets acquired by a model vendor stops being neutral.

### Not general AI education

I think we need to be careful to stay out of general AI training, like AI concepts.

The precedent cited is the FinOps Foundation's refusal to teach cloud fundamentals. Counter-pressure exists: multiple members reported that enterprise audiences still cannot answer "what is a token," and want that baseline covered somewhere.

Worth noting

Across all fifteen conversations, **not one participant confused tokenomics with cryptocurrency or blockchain tokenomics.** The name risk that gets raised internally did not materialize once with members. The naming friction that did surface was different: "token" sitting inside the word makes people assume it is only about tokens.

## Counterpoints and live tensions {section=counterpoints}

### "It is FinOps plus"

The sharpest pushback in the set. The argument: the tenets are identical, and the market has been moving up-level for years already.

It is FinOps. It's FinOps plus. Okay, it's FinOps with new taxonomy. That's my opinion. The practice is the same. You have the same tenets, real-time data for decision making, accountability, budget models. All of these are the same terms. It's just a different taxonomy.

The partial concession, after hearing the levers and personas laid out: *"The taxonomy, levers, persona, that is different. I agree."*

The counter-evidence offered elsewhere: the new levers are things FinOps practitioners have no exposure to. Model routing, context engineering, KV and cache-augmented generation, quantization, mixture of experts, low-rank adapters, hardware selection driving token output.

It's all these things that frankly FinOps people know almost nothing about.

And the buyer evidence: *"I'm not seeing the dominant buyer of our services right now be the FinOps professional. And where I do see the FinOps professional bring us into an opportunity, they're bringing in other people who own this problem."*

### The best boundary test anyone offered

Name it versus configure it

FinOps names and measures the concept. Tokenomics configures and optimizes it.

You as a FinOps practitioner would be saying, hey, we should look at prompt caching, and I know what that means, but I'm not going to tell you how to do prompt caching configurations. That's a tokenomics thing.

It's still just the person who comes in the room and goes, have we thought about KV caches, here's a description of KV caches, versus someone who comes in the room and goes, show me how we're configuring our KV caches.

A second framing worth keeping: the two disciplines as different projections of the same object.

Something like a tesseract. When we look at it from the FinOps perspective we talk about it in a particular way, and when we look at it from the tokenomics perspective we see it slightly differently, but it's actually just a different projection of the same thing.

### Too early, and moving too fast to standardize

The most serious strategic objection, raised most forcefully by a platform vendor weighing whether to allocate people.

I honestly don't know how valuable that model is in a world that's moving so fast. If you take six months to build a standard, in six months we might be beyond that.

People are intrigued, but they've got so much to get done themselves. And now they've got to take 20 percent of someone's time to come and sit with you and figure this out.

The same speaker supplied the counterweight: *"And with the risk that if we don't, then we might be steering down a standard that we didn't contribute to."*

The internal counter-argument: *"Where there's mystery, there's margins. The more complex things get, the more that common language and common layer will be needed."* Also noted: a spec is not a standard. A spec can ship now; standardization takes years.

### The authority problem

Named by one member as the single biggest structural challenge in the market, and framed as the Foundation's biggest opportunity.

If you ask me as someone who sells to FinOps what my biggest challenge is, it's that many finance people don't have authority. That's the biggest challenge in our market, the biggest one.

The follow-on: heads of AI transformation typically do not have authority either. *"They're supposed to do exploration, get interesting technologies in front of the right stakeholders, but they don't have authority."*

### Where does this live, and who is already claiming it?

A third position on the adjacent-practice question, distinct from both "it is just FinOps" and "it deserves its own everything." The argument: the existing cost team is the right home, and the work is still a step change.

I do make an argument that the FinOps team is the best place to house the tokenomics discipline, but it's a Cambrian explosion of what a FinOps team has had to do in the past.

It doesn't make sense to try to create a new team, but at the same time it is fundamentally new control surfaces and new sciences. Doing it without being exceptionally tightly interwoven with the existing team is, I think, a mistake.

Meanwhile the seat is being taken by someone else, and the objection to that is specific:

Right now what's happening is the AI centers of excellence are laying claim to it. The only way that would work is if AI is your only cost.

Worth noting the motive behind the ask that followed. This member wants published best practices partly to settle an internal turf fight, since where the discipline lives inside his own firm is *"a subject of some debate and politics going on right now."*

I'm keen to have the foundation put out some recommendations and call these best practices, because that becomes just the voice of the industry rather than the various opinions who are all weighing in now.

### Innumerable use cases, which is a different problem from a big one

It's a boil the ocean problem, not an elephant problem. The elephant in the room is that these use cases are literally innumerable.

The reason it does not reduce: *"contract review at company A is not the same thing as contract review at company B. And within company A, contract review is not the same thing as go-to-market campaign effectiveness."* The proposed way out is not to enumerate them but to classify and triage, and to name the value categories they resolve into: productivity, savings, increased revenue, and reduced risk.

### The practitioner may not exist yet

They're not really classic FinOps people, who my people are, and who are now trying to learn the token side.

When we get to the purest of the practitioners in this space, and I'm caveating that we're not sure there is a tokenomics practitioner in the way there's a FinOps practitioner as a role, they tend to be principal engineers.

The internal position is to define personas by activity across the three zones and let the practitioner role emerge, explicitly to avoid the FinOps precedent: *"In FinOps land, we invented the practitioner and told them how to influence FinOps. And then the business spent the next five years still trying to realize that FinOps is everybody's job."*

The cost of that choice, named honestly: *"Maybe the one thing we don't get from not defining the practitioner is that it's harder for us to pin down who this is for."*

### Bleeding edge versus long tail

A meaningful share of the market is still selling cloud cost management internally. One anecdote from a public-sector attendee at a recent event: *"Wait, we came to learn about cloud FinOps. Why are you talking about this other thing?"* Regionally, reported inbound skewed heavily toward Southeast Asia and the UK, with comparatively little North American AI cost inquiry, and much of it at a 101 level.

There is a really long tail of companies still just coming to adoption. And when you think about the tokenomics stuff, that's the bleeding edge.

### The value zone was the least understood, and is now partly answered

Conceded from multiple directions. Internally: *"The risk with that area is we don't really understand it. We're not even sure what the map looks like."* From a member: *"It's the end picture we are striving for, but I'm not sure we're going to solve it in the next months."* And a hard scope objection from a platform vendor, drawing the line the other way: *"That's the value of AI, but it's not the token thing."*

Also: value may not be standardizable into one method. *"Every company is a bit different in how to attribute costs to value, so I don't think there's a one-size-fits-all approach."* Value itself is plural: revenue, cost avoided, time saved, customer satisfaction, and in public sector, lives saved.

The deflection framework does not resolve the standardization objection, and it does not claim to. What it does is give the zone a defensible primitive and a denominator, which is more than the zone had before. It also raises the difficulty rather than lowering it, by insisting the labor baseline be the real current cost of the process rather than a notional headcount saving. The request that followed was explicit about wanting this settled early:

I think it's one of the things we should try and figure out sooner rather than later, and get the value measurement framework out there and collaborating on it, so that we can start to compare these results apples to apples.

### Build the benchmarks, or partner and inherit the neutrality risk?

A member walked both sides of this inside a minute. The ask was for cost-to-serve benchmarks by workload archetype, because existing public benchmarks publish per-token prices at a granularity nobody can act on. Then the reconsideration: the existing provider already has the underlying data and just needs to categorize it by business function, so perhaps the right move is partnership. The counter came straight back: acquisition by a model vendor would end that provider's neutrality, which is precisely the gap the Foundation exists to fill.

It shows you cost per input token, cache token, reasoning token. Just too much detail. It doesn't say, okay, how much is it going to really cost you? Somebody new to this area doesn't even know how to calculate what it means.

The internal caution was about over-normalizing: collapsing everything to an average task hides the thing that matters, so the artifact should let a team pick a representative workload rather than hand them a single number.

### A counterweight to the speed objection

The "too fast to standardize" argument has a rebuttal from someone who lived the equivalent cloud effort, and it turns the opacity into the case for moving:

You've got frankly more wind at your back even than you had in cloud, because of the rapid growth in spend and the opacity of it. A lot of people had cloud, they could at least do some comparison to their on-prem and the software licenses they had before. So they had some sense of things that they don't have in AI.

### The empirical basis does not exist yet

I don't even think we've gathered empirical data to say, well, if you did this with this, the results would be close, or close enough for your job. So, are we overspending based on quality? I don't know.

Related and unsolved: budgeting. *"I don't know how much I'm going to spend next month or the month after or next week even. I'm turning things on for developers. Now I'm turning it on for entire business units that are not developers. I have no idea what it's going to cost."*

### Naming

"AI economics" was independently proposed as more holistic, and internally there is appetite to treat the two terms as synonyms. The honest assessment of why the current term wins: *"Tokenomics is more fun. It's just fun to say. That's why everybody's on it."* And: *"It's changing week over week, so I think we have a chance to define what the right term is."*

### How technical should this be?

One member argued for maximum depth: *"I'm in the camp that we should make the people dealing with this as technical as possible."* Others observed a hard ceiling: *"They'll get so far, but then they need to know what questions should I be asking of the person doing the tokenomics?"* The compromise that emerged internally is a concept-versus-instance rule: teach the concept, not this week's release.

Do you need to know which of these have come out and what models they apply to, or do you want to just understand what the technique is? There might be a new one tomorrow. I'm not going to teach you that.

## A working definition, offered to be argued with {section=working-definition}

For TSC debate

Draft

**Tokenomics is the discipline of relating the full cost of AI to the value it produces, across production, consumption, and impact.**

- It covers **all** AI and AI-adjacent cost, not token spend. Compute, hardware, storage, database, energy, data center, and the licensed and embedded AI inside software you already buy.
- It is **technical and economic**. It borrows its cultural practice from FinOps rather than restating it.
- It is **constraint-based**. The objective is your organization's optimal frontier under your non-negotiable constraints, not the lowest cost and not the highest capability.
- It is **multi-resolution**. The same value-over-resources question applies to a token, a workflow, a role, and a department, and it must reconcile upward from a common unit.
- It operates **before the spend**, not only in reporting after it. Model, hardware, and architecture choices are in scope.
- Its cost unit is **cost to serve per event**, covering gateway, orchestration, and storage alongside model calls, because per-token pricing does not answer an operator's question.
- Its value unit is **deflection**, measured against the real current cost of the process rather than a notional headcount saving, with a different treatment per domain.
- It includes **governance as entitlement design**: quotas and model-to-workload assignment, deliberately unequal, rather than uniform caps.
- Its scope test is **cost incidence**. Wherever AI costs money, the question "should we be spending this?" is in scope, whichever layer the spend sits in.
- It is **one voice among several** in production decisions, where sovereignty, security, and compliance also vote. Its strongest claim on that side is the internal pricing of self-produced tokens.

## The open questions this doc does not answer {section=open-questions}

1. One lane or all three? Credible members argue both, forcefully.
2. What is a token, and can any definition be made to hold across providers who will not change their tokenizers?
3. Does tokenomics own the value zone, or does it stop at the consumption boundary and hand value off?
4. If there is no practitioner role, who is the audience for the framework, the training, and the certification?
5. Does the discipline converge back into FinOps? One board-level framing was that this is a compressed problem to be solved now, and if the job is done right it eventually reads as one discipline.
6. Does the Foundation serve the bleeding edge or the long tail, and can it credibly serve both at once?
7. Is "tokenomics" the durable name, or is "AI economics" the term the market settles on?
8. What is the correct labor baseline for deflection? The offshore marginal cost is the honest answer and the hardest bar. Is the Foundation willing to publish a standard that makes many AI business cases fail?
9. Is developer productivity the easiest place to start or the hardest? Two members with real programs said opposite things.
10. Does the Foundation build cost-to-serve benchmarks by workload archetype, or partner with an existing provider and accept the neutrality exposure?
11. Does people cost belong in cost to serve? One large operator deliberately excludes it today and tracks infrastructure only.
12. How do we value net-new work that has no baseline? Deflection answers displaced work. It says nothing about the backlog nobody was ever going to clear.
13. Does the discipline own production decisions, or only advise them? If it is one voice among several, what is it accountable for?
14. Where should the practice sit: inside the existing cost function, in an AI center of excellence, or somewhere new? Members are actively fighting about this internally and want cover.

Internal synthesis, July 2026. Quotes verbatim, speakers anonymized. Nothing here is settled doctrine.
