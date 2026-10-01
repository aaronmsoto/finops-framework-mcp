---
author: J.R. Storment
kind: insight
license: CC-BY-4.0
modified: 2026-08-29
slug: routing-wars
source_url: https://www.tokeneconomics.com/insights/podcast-16-of-tokenomics-brief-routing-wars-tokenomics-in-action/
status: Podcast episode 16 (survey data described as early, directional)
status_source: registry
title: Routing Wars: Tokenomics in Action
word_count: 4974
---

# Routing Wars: Tokenomics in Action

## Overview {section=overview}

Episode 16·Aug 25, 2026·25 min

From San Diego, J.R. Storment turns the model router story around and reports it from the buy side. Early, directional data from the State of Tokenomics survey shows how far enterprises have already gone on routing, how many are building rather than buying, and exactly where their confidence runs out.

## Episode summary {section=episode-summary}

From San Diego, J.R. Storment turns the model router story around and reports it from the buy side. Early, directional data from the State of Tokenomics survey shows how far enterprises have already gone on routing, how many are building rather than buying, and exactly where their confidence runs out.

Other ways to listen Open on Spotify Open on YouTube

Share this episode

## Episode Highlights {section=episode-highlights}

Router Wars

More than eight in ten practitioners are already running, implementing, or evaluating a model router.

05:23

Build vs Buy

Homegrown routers are tied with commercial ones for first place among practitioners already routing.

06:26

Metric Wars

Frontier labs are pushing cost per task and cost per outcome in place of cost per token.

03:27

Buyer Demands

Buyers want transparency, standardized billing data, and better forecasting before a smarter router.

10:37

8 in 10

8 in 10 practitioners are already routing

More than eight of ten survey respondents are using, implementing, or actively evaluating a model router. Fewer than one in five have no plans at all.

Survey data 05:23

Share

40%

Routing cut the bill 40% and broke the product

A support team routed its agents' traffic and cut the inference bill by 40%. Fraud investigations that looked simple went to a cheaper model, which answered them confidently and incorrectly.

Case study 18:56

Share

3x

Router users are 3x likelier to prove value

Practitioners already using or implementing a router are roughly three times as likely to say they can connect AI spend to an outcome their CFO would accept.

Survey data 12:43

Share

Routing is too critical to outsource

Executives said directly that the layer deciding which model gets the work sits too close to the quality bar to hand over casually.

Enterprise executive 06:56

Share

We are blind when it comes to spending

A verbatim open text answer from a company with billions of dollars in revenue, given in a survey section that was not about routing at all.

Survey respondentMultibillion dollar revenue company

15:44

Share

Measuring cost is easy, describing value is hard

Cost is measurable and user attribution is solvable. Describing value in a way that supports a business decision is the part practitioners say is still unsolved.

Survey respondent 15:44

Share

## Key takeaways {section=key-takeaways}

- An AI bill with no routing policy is a governance gap, not just a cost problem. Start with visibility, then route.
- Instrument routing early. Log which model served each request and break quality metrics down by model.
- Even the best routing practice only answers the cost question. Value is a leadership decision about what a good outcome is worth.
- Cost per completed task, held to a quality bar, is the one metric that connects the cost side to the value side.

From San Diego, J.R. Storment turns the model router story around and reports it from the buy side. Early, directional data from the State of Tokenomics survey shows how far enterprises have already gone on routing, how many are building rather than buying, and exactly where their confidence runs out.

The episode covers the week’s router headlines, the shift from cost per token to cost per outcome, what practitioners are asking model providers to fix before they are sold anything smarter, and a cautionary case where a 40% saving quietly broke a product. The survey is still open and these numbers are directional. The final analysis lands at Tokenomicon in Amsterdam on September 23.

### 00:00 Router Wars Begin

Nearly half of the practitioners answering our State of Tokenomics survey are already running or implementing a model router, and another four in 10 are evaluating one. Meanwhile, a fintech giant bought the domain router.com, a $60 billion code editor shipped a router of its own, and The Washington Post explained model routing to the general public.

Today, the router wars told for once from the buy side Hello from San Diego. Welcome to the Tokenomics Brief. I’m J.R. Storment, executive director of the Tokenomics Foundation, and this is the show where we work through what’s actually happening in the economics of AI. Real practitioners, real numbers, real stories, and the patterns we’re seeing across the community.

Today, the industry news gets some quick hits up top because the main story I wanna get into is not what the vendors did this month, it’s what the practitioners already told us over the last few days. Early data is coming in from our State of Tokenomics survey, and the routing picture inside of that data is pretty loud at this moment.

One thing to be clear before we get started, the State of Tokenomics survey is still open, and we’re still collecting responses, so everything you hear today is just an early directional read. We’re gonna launch the final numbers in Amsterdam. Let’s get into it.

### 01:13 Headlines on Routing

Some headlines first. Four fast stories all focused around the same area.

First, The Washington Post yesterday reported that companies have gone, in a few short months, from token maxing to tightly managing their AI budgets with a new class of services emerging to route each query to the most cost-effective model. So when a national newspaper is explaining model routing to a general audience, the topic has left the engineering blogs and entered the business sections.

But smart tokenomics is not about maximizing tokens or minimizing them. It’s about maximizing value from AI, and that is the thread for the entire episode. Second headline: the router wars are officially on. We covered in the last episode Stripe’s wild, and I will say wild because of the numbers, acquisition of OpenRouter last week.

It was reported to be over $7 million plus for this routing layer that decides which of the hundreds of different models out there answer an AI request. Last week, in fact, just a few minutes after that announcement, Ramp also launched a router of its own on router.com. One of those was coming up through developers, OpenRouter, the other coming top-down through finance with Ramp, and both converging on the same fast-growing line items: the cost of AI.

Third headline: the Cursor acquisition officially closed. We touched on this briefly last week, but SpaceX, for a reported $60 billion, acquired the coding company, and the product story tied to today that Cursor attached to that big announcement was their router. The router is a classifier that picks which model answers each query, and they claimed near frontier satisfaction at nearly 60% lower cost.

That is top frontier lab model outputs at a much lower cost. These are their numbers, so take those with a grain of salt.

### 03:14 The Metric Wars

But it’s notable that one of the biggest AI acquisitions in history was leading with a router Fourth headline, the Metric Wars. This reminds me of the Cloud Wars 10 years ago. I feel old.

But Bloomberg reports that the frontier labs are pushing a new yardstick, which is cost per task or cost per outcome instead of cost per token, while some of the cheaper rivals out there are trying to undercut on sticker price. One analyst summed up how the labs want you to see the discount token, saying, "Using open source tokens is like using cheap toilet paper."

Colorful. But there is a real measurement problem underneath the marketing, and in that case, the marketing was related to one-ply strength. But in this case, the critical thing to remember is that a token is not a standardized unit. There was a great post by Thibault at OpenAI on X.com talking about two identical pizzas, one cut into eight $2 slices and one cut into 16 slices at $1.25.

One might have cheaper slices, but one is a more expensive pizza. Different tokenizers cut the same work into different number of tokens, so a lower per-cost price does not necessarily mean a lower bill. So the only number that really survives that cutting and slicing into different smaller bits like that is a completed task or outcome number that has to factor in quality bar retries and the human time, the labor costs associated with reviewing those outputs.

So notice what every one of these stories has in common. They are all about the sell side, the supplier side, talking about this space: vendors, labs, analysts, acquirers.

### 04:51 Buy Side Survey Preview

So today, I wanted to focus on the other side of the table. Let’s talk about what the buy side just told us about routers. I’m gonna share with you some early responses to the State of Tokenomics survey.

This is from just the first few hundred practitioners who responded. And note, we only opened the survey three business days ago, and we’re already nearing 400 responses. So what will follow is a directional early read. It is not the final results. The full analysis is gonna be landing at the Amsterdam Tokenomics Con on September 23rd.

### 05:23 Adoption and Build vs Buy

But we’re already seeing some trends emerge in the early data.

So let’s start with what I consider an early headline in the findings. Among practitioners who answered questions about routing in the survey, more than eight out of 10 of them are using, implementing, or actively evaluating a model router.

Of those, nearly half are already using and, or implementing, and fewer than one in five have no plans at all to implement a router. So put that next to some of the headlines we just ran. The vendors are not creating this market. They’re not making something up that isn’t there. The router wars are not coming to the enterprise.

They’re already in the enterprise. We asked in the survey about three different kinds of routers separately. We asked about commercial routers, like the ones we just talked about. We talked about open source routers, and we also talked about, asked about homegrown routers. That is a building of your own router.

Interestingly, of those who are already using routers, homegrown is tied for first place. Those using commercial routers and those using homegrown routers reported almost identical numbers. Roughly a quarter of respondents answering that question have said that they are just as likely to build a router as they are to buy one right now.

So think about what this means when the enterprise is building their own infrastructure layer while you’ve got massive numbers in the headlines from well-funded vendors giving away or selling it. This is not necessarily a tooling gap that is out there right now.

### 06:56 Trust and Ownership

It is a trust decision. And in some of my direct conversations with executives, I’ve heard statements like, "Model routing is too critical for us to outsource.

We need to build it in-house." So the layer that decides which model gets your work is too important for some, and it’s too close to your quality bar to hand over casually. And I say that word with an underline, casually. It’s not that you can’t do it, because a lot are, but it’s a big decision to make.

And it connects to the question that developers are asking really loudly out there as the router wars converge and all this coverage lands, which is that some routers are coming from companies that also sell models, which may have reasons to send work their own way or could potentially favor their own models.

So when the layer picking the model has a model to sell, who owns the router matters as much, potentially, depending on how you look at it, how skeptical you are about how well it routes. So a quarter of this community is saying that they will absolutely be answering the model routing question on their own.

Now, there’s a second reading that came out of that homegrown number, and this is maybe a little less flattering to the maturity of the market right now People build in-house when nothing on the shelf fits what they need or they’re unhappy with the offerings. One read on the situation. The commercial routing market is really just months old maybe years if you count in very small single digits.

The enterprises that needed this layer last year did not have the luxury of waiting for the router wars to produce a winner, so they began building, which sets up one of the most interesting cohorts in the data we discussed, which is 40% of the respondents are actively evaluating router solutions right now.

That is a lot of purchasing power and architecture decision-making, making happening in a single window of time and on a layer of the stack that barely had a market a year ago. We don’t have the final numbers, but nearly half of the respondents to the survey are companies that have billions of dollars in revenue, and about a quarter so far are those that have over $10 billion in revenue.

So these are big companies making big buying decisions. And if these early numbers hold, the next year is when enterprise routing as a layer is really gonna get decided in the industry one evaluation at a time, which is probably the reason we’re seeing so much noise from the vendors right now about routing and such big dollar figures attached to it.

Who owns the routing, what it logs, what quality bar it needs to answer to, these are things that people are trying to figure out right now. So in the survey, practitioners are also telling us, kind of unprompted, where routing sits in their mental model in some of their open text answers. When we asked what counts to these practitioners as a core tokenomics capability, the open text answers came back with things like routing each request to the most cost-effective model, no surprise there, and that they were really focused on model and route selection driven by cost and quality trade-offs.

Nobody wants to put routing simply, or almost nobody actually simply put routing as a core capability answer to that question. Most of the time people wrote it in other areas. So in their heads, routing has already kinda moved from an optimization capability to a core capability in the data we’re seeing.

### 10:37 What Buyers Want

When we asked practitioners what they want from the model and token providers themselves, that was we asked them, "If you were giving feedback on the product, what do you wanna see them deliver?" Three roughly demands started to come out in the early responses. The first feedback point for the model and token providers themselves was they want transparency first.

They want better visibility into what the AI actually costs with any hidden or attached fees, and any unclear billing named better and unclear billing being named again as a barrier to current value metrics for them. The second thing we saw was standardization. Respondents are frustrated with every provider inventing their own billing data format, and several asked by name for FOCUS, the FinOps Open Cost and Usage Specification style standardization for their cost and usage data for AI and tokens.

The third theme that came out of that question set was tooling. People are looking for better forecasting for cost controls and the ability to map spend to outcomes. Remember, we were talking about cost per outcome here. So if you put those three together, the message coming through from the buyers to the sellers is pretty straightforward, which is, "Before you sell us a smarter router," 'cause that wasn’t what they were asking for, "please make the meter, the data, more legible."

### 12:00 The Confidence Ladder

So one other pattern that ties across the whole data set is one of the most interesting findings that popped out of this, which is around a correlation between router engagement and confidence. So visibility first. Among practitioners who are already running or implementing a router, two-thirds of those are moderately confident in their ability to get visibility into AI and token spending.

Among those still evaluating, it was about four in 10, so less likely to have confidence in their visibility. Among those with no plans for model routers, less than one in five respondents were confident about their visibility to get insights into their spending data. And the same ladder shows up perhaps even more strongly on the value side.

Remember, value is really the outcome we’re looking for with all of this. Cost is just an input to that. Practitioners using or implementing a router, okay, so those who’ve already started the router journey, get this: they are roughly three times as likely as those without a router to say that they can connect AI spend to a business outcome that their CFO would accept.

In short, and yes, it’s correlation, the further along an organization is into their routing journey, the more likely it can also articulate both what the AI costs and the value they’re getting out of the AI. Okay, so now a caveat. Let’s be careful with that particular bit of data because that whole correlation versus causation thing, the router is not necessarily the thing causing the confidence.

If anything, it could run the other direction because you cannot route on cost and quality until you can measure cost and quality. A router is theoretically a decision engine, and that decision engine is only as good as the signals feeding it. So if you feed it aggregate spend with no attribution, it will optimize for a number that nobody really owns, so we get back to the metering really needing to come first.

The router is what a mature practice builds on top of visibility. Routing is not a shortcut to visibility, which means if your organization has no routing plans and you likely have major blind spots, those are not two separate problems. They’re really one problem, and the visibility portion of that needs to come first.

Now, the good news hiding in all of this same data is that the ladder toward value and visibility is pretty clearly climbable. The evaluating cohort sits between two extremes on every confidence measure, which looks a lot like organizations building the measurement muscle on one side and the routing muscle on the other side together with one of those muscles pulling the other along with it Now let’s look at another part of this story.

### 14:48 The Value Layer Is Still Missing

Even among the most sophisticated group in the data, the early data, caveat, triple asterisk, not final yet, the practitioners who were already running routers of that group, those already running routers, only about one in three are confident that they can connect AI spend to a business outcome their CFO would accept.

So even though they might have one of the most solid routing practices in the world, it might be solving the cost problem and cost visibility problem, but it is not necessarily solving the value problem which their CFO cares about. And that finding is a pretty significant reframe to the entire router war storyline we’re seeing in the media just in the last week.

So the vendors are fighting over who owns that cost layer, but the practitioners, when we talk to them, are really working on who owns a layer up, which is the value layer. Which brings us to some of the direct quotes from the open text fields in the survey. I pulled out five of them. All five of these are verbatim.

First one: "We are blind when it comes to spending." And that was a company with billions of dollars of revenue. Second one: "Measuring cost is easy. Attributing to users is easy. Discovering and describing value, however, in a meaningful way for business decisions is hard." Third: "We can see the value, but it’s hard to tell if it’s worth the money.

Can I do the same with a cheaper model?" Question mark. Four: "Leadership hasn’t answered the question around value and ROI." Full stop. And five: "Turning AI into tangible, measurable business value remains elusive." Let’s go back to one of those quotes in the middle there for a second. It ended with a question of, "Can I do this with a cheaper model?"

Now, that is a practitioner thinking through and independently verifying and asking the routing question in a section of the survey that was not about routing. So survey covered a lot of areas that I haven’t touched on in this, and we kept finding throughout that survey routing coming back as a consistent theme.

So an early qualitative read on this shares something about what we’re seeing around confidence and CFOs. Only about one in 10, one in 10 of the total respondents is very confident that they can connect AI spend to business outcomes that their CFO would accept. Roughly three quarters, 75%, are only slightly confident they can do that or not at all confident.

So visibility as a measure was further along, but just barely. It was just over one in 10 who said that their spend is both fully metered and attributable across workloads and teams. Couple other quick points before we get out of the data.

### 17:36 Open Weights Rebalancing

Respondents also talked in a couple of the questions about the balance between open weight and closed frontier models in their organizations.

This is a question I want to dig heavily into in future podcast episodes because there is a ton in here. We’re hearing qualitative and quantitative data about this shift or desired or perceived shift from closed frontier models to open weights. We asked in the survey where they stand today. We also asked where they expect to be in the next 12 months.

I kind of expected a stampede. I’ve heard things from SVPs at tech companies like, "We’re trying to get to 80% open weights." This is qualitative anecdotes. But in the survey data, we did not hear so far, in the first few hundred respondents, a stampede. We saw a rebalancing between open weights and frontier closed weights.

So this raises the stakes again on routing because a portfolio of models is exactly the situation that a router exists to manage Roughly in the data, and this is very early still we saw just a small bump up, 20 to 30% increased plans around moving toward open weights over the next year as plans. But still, a very material amount of AI expected to go through closed frontier models.

### 18:56 When Routing Breaks the Product

The best cautionary tale in the router wars coverage came from one of the teams, and this is from the news, that had routed their support agents' traffic and cut the inference bill by 40%. It was reported in the story that cut in cost actually broke the product. So the classifier in the router sent some simple-looking queries to a cheaper model, and some of those simple-looking queries were fraud investigations, and that simple model answered them confidently, but it was confident and incorrect.

So the retention damage to this particular company ran four to five times higher cost than the savings they got from the cheaper model, and it took months for them to surface the damage. So this fix was a per-tier quality monitoring system they put in alongside their routing, and after that system, they did settle into a higher savings rate, but with that quality bar intact.

And so the lesson here is don’t not route. The lesson is don’t stay away from routing. The lesson is that we need to instrument the routing. We need to provide context around the routing. We need to provide evals for the routing. We need to check the router’s work. Sometimes that’s gonna involve human time.

I know we would love to automate everything we can and just make it all flow, but it is gonna be a mix of computers and humans. We do need to log which model served every request. We do need to break out quality metrics, compare them to the models that produce them, and we do need to look at savings numbers.

But we cannot see the quality cost if we are not looking at the outcomes that those are driving, if we’re just looking at the cost numbers themselves. We need to look at the results from those and related review times So looking at the headlines, the sell side, the vendors, those out there, they have spent months fighting over who owns the routing layer, and I think we’re kind of just at the beginning stage of this.

This feels like these giant acquisitions are things we’re gonna look back in five years and say, "Wait, they paid how much for this router?" So the buy side and the early data we’ve seen within the survey data is a little more encouraging. Eight in 10, again, of those people completing the survey so far have already engaged in using a router.

That’s good progress. Quarter of those are building their own, and the practitioners furthest along are treating routing as a core capability that sits on top of metering and visibility. The message that they sent to the writers is that they essentially want legibility, they want better visibility before they get intelligence.

They want better data. They want cleaner attribution. So the unsolved problem though, for all of them though, across all of this, even the most sophisticated, was not, "Can I see and predict and attribute my costs?" It was, "Can I show the value?" And that’s exactly the gap that we’re trying to measure in this survey, and we’ll hopefully have some data on once all the answers are in.

So one more time on that, these are early directional numbers from a survey that is still collecting responses. We’re gonna get the final numbers Amsterdam, September 23rd at Tokenomicon. Quick side note. On the last episode, I promised we would be coming out with a per-watt episode. That per-watt episode, talking about revenue per watt and tokens per watt and a lot of the production side energy-related tokenomics is still coming.

We did actually ask a question in the survey that I’ll tease now as we build more info out there about how many practices are looking at energy in their tokenomics practice. How many of them are considering energy as part of the equation? And we did, early data still, over a third of them are considering energy in their practice.

So we’re gonna draw that thread through in a future episode to look at how that’s implementing in real life.

### 22:34 Takeaways and Closing

Three quick takeaways from this episode. One, if your organization has an AI bill and no routing policy, you have a governance gap, not just a cost problem. The data suggests that there is an order to the operations that you should follow.

Start with visibility first, then look at the router second. You cannot route on what you cannot measure. Second takeaway, instrument routing early. Log which model served each request and break down quality metrics by model. There was an example, 40% savings, but it did end up breaking the product because they did not have the proper instrumentation in place.

Third takeaway, even the best routing practice only answers the cost question. The value question, which is what did the AI buy us, how did that impact the business, is answered by leadership deciding and measuring what a good outcome looks like. Cost per completed task at a minimum with your quality bar is a metric that can connect the two cost and value sides.

And final word today goes to Steve Trask, who is the COO of the Technology Value Umbrella here at the Linux Foundation. He sent this to me in a Slack over the weekend, his thoughts on tokenomics. He said, and I quote, "Tokenomics is not a team or a person. It is the technical and economic set of activities surrounding AI, which is practice across the entire organization."

End quote. So Steve, not a team, not a person, not a practice. Everything in today’s data is pointing us in the same direction. The routing decision requires an engineer, it requires a finance partner. There needs to be a product owner in the same conversation. The executive has to define what value looks like.

You need a leader who’s willing to put a number on what a good outcome is worth. None of this lives in one job description or persona, and this is the work that the Tokenomics Foundation is working on right now to define That’s gonna do it for today’s brief. I have one ask for you, dear listener, if you’re listening on Spotify or YouTube.

In addition to the usual ask to go subscribe and hit the like button, all that stuff, my ask is, would you consider taking the State of Tokenomics survey? It is still open. Every response we get is gonna help sharpen the responses and get us to better data for the community. I’ll put the link in the show notes.

And remember to tune in the 23rd of September in Amsterdam, either in person or via the live stream. I’m J.R. Storment. I will see you soon.
