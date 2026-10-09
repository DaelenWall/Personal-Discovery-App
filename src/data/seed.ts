import { TOPICS, type Idea, type Source, type Store } from "../domain/types";

const createdAt = "2026-10-06T00:00:00.000Z";
type Seed = {
  title: string;
  sentence: string;
  explanation: string;
  mechanism: string;
  example: string;
  limitation: string;
  topics: string[];
  related: string;
  url: string;
  source: string;
  publisher: string;
  keywords: string[];
};

// Original editorial paraphrases. These notes are not excerpts from linked works.
const seeds: Seed[] = [
  {
    title: "Goodhart’s law",
    sentence:
      "A measure can lose its usefulness when people start optimizing it as a target.",
    explanation:
      "A useful metric usually stands in for something harder to observe. Test scores stand in for understanding; a response time stands in for helpful service. Once the proxy becomes a target, people can improve it without improving the underlying thing. The relationship that made it useful begins to break. Before choosing a target, ask what someone could do to raise the number while making the real outcome worse.",
    mechanism:
      "Optimization selects actions that exploit the gap between a proxy and its purpose. Even without cheating, concentrated effort can narrow attention to the measured part of a larger system.",
    example:
      "A help desk closes tickets quickly, but unresolved customers must open new ones. Closure speed rises while service deteriorates.",
    limitation:
      "Metrics still help. Use several imperfect measures alongside direct inspection rather than abandoning measurement.",
    topics: ["Economics", "Systems thinking"],
    related: "Principal-agent problem",
    url: "https://arxiv.org/abs/1803.04585",
    source: "Categorizing Variants of Goodhart’s Law",
    publisher: "Manheim & Garrabrant · arXiv",
    keywords: ["measure", "target", "proxy", "optimiz"],
  },
  {
    title: "Survivorship bias",
    sentence:
      "The examples you can see may systematically exclude the failures you need to understand.",
    explanation:
      "Studying visible successes can teach the wrong lesson if unsuccessful cases disappeared before you could observe them. A sample of thriving businesses excludes businesses that closed. Their shared habits might reflect survival rather than cause it. The missing cases change the question: instead of asking what winners did, ask how often the same behavior occurred among everyone who tried. Better inference starts by reconstructing who was eligible to appear in the sample.",
    mechanism:
      "Selection into the observed group depends on the outcome. Conditioning on survival makes the remaining sample different from the population you want to explain.",
    example:
      "A portfolio of funds that still exist excludes closed funds, potentially overstating historical returns.",
    limitation:
      "Visible successes can still contain useful evidence when the selection process is modeled or comparison cases are available.",
    topics: ["Psychology", "Decision-making"],
    related: "Base-rate neglect",
    url: "https://doi.org/10.1093/rfs/5.4.553",
    source: "Survivorship Bias in Performance Studies",
    publisher: "Review of Financial Studies",
    keywords: ["missing", "fail", "sample", "surviv"],
  },
  {
    title: "Bayesian updating",
    sentence:
      "Evidence changes a belief in proportion to how much more expected it is under one explanation than another.",
    explanation:
      "A surprising observation is not automatically strong evidence for your favorite explanation. Ask whether the alternatives would also predict it. Bayesian updating combines your starting belief with the relative likelihood of the observation under competing hypotheses. Evidence that is common under both barely distinguishes them. You need not calculate every probability to use the habit: state your prior view, identify competing explanations, and ask what this new information actually separates.",
    mechanism:
      "Posterior odds equal prior odds multiplied by a likelihood ratio. Repeated updates can be performed sequentially when the relevant conditional relationships are accounted for.",
    example:
      "An alarm is less convincing evidence of a fire when harmless triggers are common and fires are rare.",
    limitation:
      "Poor priors, incomplete hypotheses, and correlated evidence can produce confident but misleading updates.",
    topics: ["Mathematics", "Decision-making"],
    related: "Base-rate neglect",
    url: "https://plato.stanford.edu/entries/bayes-theorem/",
    source: "Bayes’ Theorem",
    publisher: "Stanford Encyclopedia of Philosophy",
    keywords: ["prior", "evidence", "likelihood", "belief"],
  },
  {
    title: "Map and territory",
    sentence:
      "A model is useful because it omits reality, but its omissions become dangerous when forgotten.",
    explanation:
      "A map helps you navigate by leaving things out. A model does the same for thought: it compresses a situation into a few variables and relationships. The danger begins when we treat the compression as the situation itself. A financial model might ignore trust; a road map might ignore an impassable flood. Ask what the representation was made for, what it leaves out, and which observation would show that its simplifying assumptions no longer fit.",
    mechanism:
      "Abstraction preserves selected relationships while discarding detail. The same compression can help one task and mislead another.",
    example:
      "A transit map accurately shows station connections while distorting walking distances.",
    limitation:
      "No model can include everything. The aim is fit for a purpose, not perfect representation.",
    topics: ["Philosophy", "Design"],
    related: "Falsifiability",
    url: "https://plato.stanford.edu/entries/models-science/",
    source: "Models in Science",
    publisher: "Stanford Encyclopedia of Philosophy",
    keywords: ["model", "omit", "representation", "reality"],
  },
  {
    title: "Ship of Theseus",
    sentence:
      "Whether something remains the same depends on which kind of continuity matters.",
    explanation:
      "Imagine replacing a ship’s planks one at a time until none of the originals remain. Is it the same ship? Now assemble the discarded planks into another ship. Which one has the better claim? The puzzle reveals that material, structure, history, and use provide different criteria for identity. Everyday disagreements about a rebuilt neighborhood, a changing organization, or a restored artwork often hide disagreement about which criterion should count.",
    mechanism:
      "Identity over time becomes difficult when continuity of matter and continuity of organization diverge. Different practical purposes can select different criteria.",
    example:
      "A software project replaces every module but retains its name, users, and development history.",
    limitation:
      "A thought experiment clarifies criteria; it need not produce a single answer for all objects.",
    topics: ["Philosophy", "History"],
    related: "Map and territory",
    url: "https://plato.stanford.edu/entries/identity-time/",
    source: "Identity Over Time",
    publisher: "Stanford Encyclopedia of Philosophy",
    keywords: ["identity", "continuity", "replace", "same"],
  },
  {
    title: "Falsifiability",
    sentence:
      "A claim becomes more informative when you can describe an observation that would count against it.",
    explanation:
      "An explanation that can accommodate every possible outcome makes few commitments. A testable claim rules something out: if this happens under these conditions, the explanation needs revision. Try turning a broad belief into a prediction before seeing the result. This helps distinguish learning from retrofitting a story. It also forces clarity about the conditions under which a claim is supposed to hold and which observations would challenge it.",
    mechanism:
      "A risky prediction constrains possible observations. Failed predictions create pressure to revise the hypothesis or its supporting assumptions.",
    example:
      "Instead of saying a feature will improve usability, predict that new users will complete a specific task with fewer errors.",
    limitation:
      "A failed test may expose an auxiliary assumption or faulty measurement rather than refute a whole theory.",
    topics: ["Science", "Philosophy"],
    related: "Bayesian updating",
    url: "https://plato.stanford.edu/entries/popper/",
    source: "Karl Popper",
    publisher: "Stanford Encyclopedia of Philosophy",
    keywords: ["test", "prediction", "against", "refut"],
  },
  {
    title: "Opportunity cost",
    sentence: "The cost of a choice includes the best alternative you give up.",
    explanation:
      "A choice consumes more than money. It uses time, attention, space, or capacity that could have served another purpose. Opportunity cost compares a decision with the best realistic alternative, not with doing nothing by default. A free meeting can be expensive if it displaces important work. Make the alternative concrete before deciding: what would this same hour or resource otherwise accomplish? That comparison often changes what appears cheap or worthwhile.",
    mechanism:
      "Scarce resources cannot serve all uses simultaneously. The relevant comparison is the value of the next best feasible use.",
    example:
      "Keeping an unused room for storage prevents using it as a workspace even when no rent changes hands.",
    limitation:
      "Alternatives are uncertain and sometimes incomparable; the concept supports judgment rather than demanding false precision.",
    topics: ["Economics", "Decision-making"],
    related: "Sunk cost",
    url: "https://openstax.org/books/principles-economics-3e/pages/2-1-how-individuals-make-choices-based-on-their-budget-constraint",
    source: "How Individuals Make Choices",
    publisher: "OpenStax",
    keywords: ["alternative", "give up", "scarce", "forgo"],
  },
  {
    title: "Sunk cost",
    sentence:
      "Irrecoverable past spending should not decide whether the next investment is worthwhile.",
    explanation:
      "You cannot undo yesterday’s investment by spending more tomorrow. A sunk cost is a past cost that cannot be recovered whichever option you choose now. The current decision should compare future benefits and costs. This can be emotionally difficult because stopping feels like admitting a mistake. Ask whether you would choose the same next step if you inherited the situation today without having made the original investment yourself.",
    mechanism:
      "People may treat continued investment as a way to justify earlier spending, even when it does not improve future prospects.",
    example:
      "Finishing a disliked book solely because you already read half of it spends more time without recovering the earlier hours.",
    limitation:
      "Future switching costs, learning value, and commitments are real considerations; they are not necessarily sunk costs.",
    topics: ["Psychology", "Economics"],
    related: "Opportunity cost",
    url: "https://openstax.org/books/principles-economics-3e/pages/2-1-how-individuals-make-choices-based-on-their-budget-constraint",
    source: "How Individuals Make Choices · Sunk Costs",
    publisher: "OpenStax",
    keywords: ["past", "recover", "future", "spent"],
  },
  {
    title: "Regression to the mean",
    sentence:
      "An extreme measurement is often followed by a less extreme one even when nothing caused an improvement.",
    explanation:
      "Performance combines relatively stable ability with temporary variation. An unusually good or bad result often contains an unusually large temporary component. On the next measurement that component may be smaller, bringing the result closer to the person’s typical level. If you intervene only after extreme results, you can mistake ordinary variation for an intervention effect. Compare with a similar untreated group before taking credit for the apparent improvement.",
    mechanism:
      "Selecting observations for extremeness also selects unusually large noise. Imperfectly correlated repeated measurements tend to be less extreme.",
    example:
      "A team has a terrible week, receives a stern talk, then performs normally. The talk may not have caused the recovery.",
    limitation:
      "Real changes also happen. Regression is a comparison problem, not a reason to dismiss every improvement.",
    topics: ["Mathematics", "Psychology"],
    related: "Survivorship bias",
    url: "https://www.nobelprize.org/uploads/2018/06/kahnemann-lecture.pdf",
    source: "Maps of Bounded Rationality",
    publisher: "Nobel Prize",
    keywords: ["extreme", "noise", "typical", "variation"],
  },
  {
    title: "Path dependence",
    sentence:
      "Earlier choices can reshape the options and costs of later choices.",
    explanation:
      "Some decisions change more than the immediate outcome. They create skills, infrastructure, standards, or expectations that make the same route easier next time. As a result, two systems with similar current resources can behave differently because their histories differ. To understand why an arrangement persists, trace the investments and coordination that accumulated around it. A better alternative in isolation may still be expensive to adopt once the surrounding system has adapted.",
    mechanism:
      "Increasing returns and switching costs amplify early differences. Coordination can stabilize a convention even when another convention would also work.",
    example:
      "An organization’s first software choice shapes hiring, training, and integrations, making a later migration costly.",
    limitation:
      "History constrains without fully determining outcomes; shocks and deliberate changes can break a path.",
    topics: ["History", "Technology"],
    related: "Network effects",
    url: "https://faculty.econ.ucsb.edu/~tedb/Courses/Ec100C/DavidQwerty.pdf",
    source: "Clio and the Economics of QWERTY",
    publisher: "American Economic Association",
    keywords: ["history", "switch", "earlier", "cost"],
  },
  {
    title: "Emergence",
    sentence:
      "Interactions among parts can produce patterns that are not obvious from examining each part alone.",
    explanation:
      "A traffic jam does not require a driver who intends to create one. Small braking reactions can propagate through a line of cars and form a large moving pattern. Emergence directs attention to relationships, feedback, and scale rather than only to the properties of isolated components. When a system behaves unexpectedly, ask what each part responds to and how those responses change the conditions faced by other parts.",
    mechanism:
      "Local rules feed back through a network of interactions. The resulting collective pattern can have a description different from the rules of its components.",
    example:
      "Simple neighbor-following rules can produce coordinated movement in a simulated flock.",
    limitation:
      "Calling something emergent is a starting point for explanation, not an explanation by itself.",
    topics: ["Science", "Systems thinking"],
    related: "Second-order effects",
    url: "https://plato.stanford.edu/entries/properties-emergent/",
    source: "Emergent Properties",
    publisher: "Stanford Encyclopedia of Philosophy",
    keywords: ["interaction", "parts", "pattern", "local"],
  },
  {
    title: "Governing the commons",
    sentence:
      "Shared resources can be sustained when users create workable rules, monitoring, and accountability.",
    explanation:
      "A shared resource invites overuse when each person receives the full benefit of taking more but shares the damage with everyone else. Yet failure is not inevitable. Communities can develop rules about access, contributions, monitoring, and conflict resolution. The useful question is not simply whether a resource is public or private. Ask who uses it, how decisions are made, how behavior becomes visible, and how rules can adapt to local conditions.",
    mechanism:
      "Institutions align individual incentives with the continued health of a common resource and make cooperation more dependable.",
    example:
      "A community irrigation system agrees on water allocation and maintenance responsibilities, with users monitoring each other.",
    limitation:
      "Rules that work at one scale or in one community may fail when boundaries, trust, or enforcement change.",
    topics: ["Economics", "Sociology"],
    related: "Principal-agent problem",
    url: "https://www.nobelprize.org/prizes/economic-sciences/2009/ostrom/lecture/",
    source: "Beyond Markets and States",
    publisher: "Nobel Prize",
    keywords: ["shared", "rules", "monitor", "resource"],
  },
  {
    title: "Second-order effects",
    sentence:
      "A decision changes how others respond, so its indirect effects can outweigh its immediate result.",
    explanation:
      "A first-order effect is the direct consequence of an action. A second-order effect comes from the responses that consequence creates. A subsidy may reduce a buyer’s price, then alter demand, supplier behavior, and market prices. Trace at least one response loop before acting: who notices the change, what incentives do they face, and what will they do next? This habit is especially useful when a simple fix repeatedly produces new problems.",
    mechanism:
      "An intervention changes the environment in which people or systems act. Their adaptations create additional effects that the initial static comparison misses.",
    example:
      "Adding road capacity can encourage additional driving, reducing part of the expected congestion benefit.",
    limitation:
      "Indirect chains become uncertain quickly. Use explicit hypotheses and observations instead of elaborate speculative stories.",
    topics: ["Systems thinking", "Economics"],
    related: "Emergence",
    url: "https://www.aeaweb.org/articles?id=10.1257/aer.101.6.2616",
    source: "The Fundamental Law of Road Congestion",
    publisher: "American Economic Association",
    keywords: ["response", "indirect", "incentive", "adapt"],
  },
  {
    title: "Exploration and exploitation",
    sentence:
      "Choosing a familiar good option and learning about uncertain options serve different purposes.",
    explanation:
      "Exploitation uses what you already know to obtain a good result. Exploration accepts uncertainty to improve future choices. Always repeating the current best option can hide better alternatives; constantly trying new options prevents you from benefiting from what you learned. The balance depends on how long the knowledge will remain useful and how costly experiments are. A small, deliberate experiment can be worthwhile even when its immediate payoff is lower.",
    mechanism:
      "An uncertain option has both an immediate expected payoff and an information value for later decisions.",
    example:
      "A cook tries one unfamiliar ingredient in a small batch rather than replacing an entire dependable menu.",
    limitation:
      "The best balance changes when circumstances shift or when an experiment has irreversible costs.",
    topics: ["AI", "Decision-making"],
    related: "Opportunity cost",
    url: "https://www.cs.cornell.edu/courses/cs683/2007sp/lecnotes/week8.pdf",
    source: "Learning, Games, and Electronic Markets: Bandits",
    publisher: "Cornell University",
    keywords: ["learn", "uncertain", "familiar", "experiment"],
  },
  {
    title: "Predictive processing",
    sentence:
      "Perception can be understood as a continuing negotiation between expectations and incoming signals.",
    explanation:
      "Perception is not simply a camera recording the world. In predictive accounts, the brain uses prior expectations to interpret incomplete sensory signals and adjusts those expectations when signals disagree. This can explain why context changes what a faint sound or ambiguous image seems to mean. The interesting question is how much weight the system gives a prediction versus a mismatch, especially when the incoming signal is noisy or uncertain.",
    mechanism:
      "Hierarchical models generate predictions, while mismatches help update the model. The weight assigned to an error depends on estimated reliability.",
    example:
      "An unclear word becomes easier to hear when you know the topic of the conversation.",
    limitation:
      "Predictive processing is a family of theoretical accounts; broad applicability does not establish every proposed mechanism.",
    topics: ["Psychology", "Biology"],
    related: "Bayesian updating",
    url: "https://doi.org/10.1017/S0140525X12000477",
    source: "Whatever next? Predictive brains, situated agents",
    publisher: "Behavioral and Brain Sciences",
    keywords: ["prediction", "signal", "expect", "error"],
  },
  {
    title: "Availability heuristic",
    sentence:
      "What comes easily to mind can feel more common than it actually is.",
    explanation:
      "Memory supplies examples faster than statistics do. Vivid, recent, or repeated events can therefore dominate estimates of frequency and risk. The ease of recalling an example is informative about your experience, but it is not a reliable count of all events. When a striking story drives a decision, compare it with a denominator: how many opportunities were there for the event to occur, and what does a more representative sample show?",
    mechanism:
      "Ease of retrieval becomes a shortcut for judging frequency. Salience and exposure affect retrieval independently of true prevalence.",
    example:
      "After extensive reporting of a rare incident, a person may overestimate how often it happens.",
    limitation:
      "Availability can be useful when your experience is representative; the problem is treating every accessible memory as representative.",
    topics: ["Psychology", "Decision-making"],
    related: "Base-rate neglect",
    url: "https://www.nobelprize.org/uploads/2018/06/kahnemann-lecture.pdf",
    source: "Maps of Bounded Rationality",
    publisher: "Nobel Prize",
    keywords: ["memory", "common", "vivid", "frequency"],
  },
  {
    title: "Base-rate neglect",
    sentence:
      "A compelling description needs to be considered alongside how common each possibility was before it arrived.",
    explanation:
      "Specific details can overwhelm background rates. A description may sound typical of a rare category even though a common category remains more likely. Start by asking how many cases belong to each group, then consider how well the new evidence distinguishes them. This is not a rule to ignore individual details. It is a reminder that evidence updates an existing probability rather than creating one from a story alone.",
    mechanism:
      "Posterior probability depends on both prior frequency and diagnostic evidence. Ignoring the former can inflate rare explanations.",
    example:
      "A classifier with impressive accuracy can still produce many false alerts when the event it detects is extremely rare.",
    limitation:
      "The relevant reference class can be disputed, and genuinely diagnostic evidence can outweigh a low base rate.",
    topics: ["Mathematics", "Psychology"],
    related: "Bayesian updating",
    url: "https://plato.stanford.edu/entries/bayes-theorem/",
    source: "Bayes’ Theorem",
    publisher: "Stanford Encyclopedia of Philosophy",
    keywords: ["common", "prior", "rate", "rare"],
  },
  {
    title: "Signaling",
    sentence:
      "An action can communicate hidden information when it is easier for one kind of person to take than another.",
    explanation:
      "When qualities are hard to observe, people interpret visible actions as evidence. A signal is especially informative when producing it has different costs for people with different hidden qualities. A promise alone may reveal little because anyone can make it. A costly commitment may reveal more, though expense by itself does not guarantee honesty. Ask which people could imitate the signal and what would make imitation difficult for them.",
    mechanism:
      "Different production costs can separate types in an equilibrium, allowing observers to infer information from the chosen action.",
    example:
      "A seller offering a meaningful repair warranty has more at risk if the product is unreliable.",
    limitation:
      "Signals can become wasteful competitions, and institutions or conventions can change what a signal conveys.",
    topics: ["Economics", "Sociology"],
    related: "Principal-agent problem",
    url: "https://www.nobelprize.org/prizes/economic-sciences/2001/spence/lecture/",
    source:
      "Signaling in Retrospect and the Informational Structure of Markets",
    publisher: "Nobel Prize",
    keywords: ["information", "cost", "signal", "imitat"],
  },
  {
    title: "Loss aversion",
    sentence:
      "The prospect of losing something can carry more weight than a comparable gain.",
    explanation:
      "People often evaluate an outcome relative to a reference point, such as what they currently own or expected to receive. A move below that point can feel more consequential than a similar move above it. The framing of an option can therefore change choices even when the underlying outcomes are alike. Before deciding, describe the same trade-off from a different reference point and check whether your preference changes with the wording.",
    mechanism:
      "Reference-dependent valuation can be asymmetric around the reference point. A perceived loss and an equal-sized perceived gain need not have opposite values of equal magnitude.",
    example:
      "Someone rejects a fair gamble when one outcome is described as losing part of an existing balance.",
    limitation:
      "The size and presence of loss aversion depend on context; it is not a universal fixed multiplier.",
    topics: ["Psychology", "Economics"],
    related: "Sunk cost",
    url: "https://www.nobelprize.org/uploads/2018/06/kahnemann-lecture.pdf",
    source: "Maps of Bounded Rationality",
    publisher: "Nobel Prize",
    keywords: ["loss", "gain", "reference", "point"],
  },
  {
    title: "Principal-agent problem",
    sentence:
      "Delegating a task creates problems when the person doing it has different incentives and better information.",
    explanation:
      "A principal wants a result and delegates work to an agent. The agent may have other goals and observe details the principal cannot easily verify. A contract or metric tries to bridge the gap, but can create new ways to optimize appearances. When designing delegation, ask what the agent can observe, what the principal can verify, and which incentives reward the actual purpose. Trust, professional norms, and careful measurement can each contribute.",
    mechanism:
      "Information asymmetry limits monitoring, while divergent preferences make the agent’s preferred action differ from the principal’s.",
    example:
      "A contractor paid per repair may have different incentives from a customer who wants lasting reliability.",
    limitation:
      "People also act from intrinsic motivation and duty. Assuming pure self-interest can damage useful trust.",
    topics: ["Economics", "Systems thinking"],
    related: "Goodhart’s law",
    url: "https://www.nobelprize.org/prizes/economic-sciences/2016/advanced-information/",
    source: "Contract Theory",
    publisher: "Nobel Prize",
    keywords: ["incentive", "delegate", "information", "agent"],
  },
  {
    title: "Chesterton’s fence",
    sentence:
      "Before removing an inherited rule, understand what problem it was built to solve.",
    explanation:
      "An old constraint can look pointless when its original context is forgotten. Removing it may restore a problem that the constraint quietly prevented. The useful habit is to investigate the function of the rule before deciding its future. Find the original risk, check whether that risk still exists, and compare alternatives that address it more directly. Understanding why a rule exists does not mean preserving it forever.",
    mechanism:
      "Successful safeguards can hide the failure modes they prevent, making the intervention appear unnecessary to later observers.",
    example:
      "A slow approval step may protect against accidental deletion; replace it with a better safeguard after identifying that role.",
    limitation:
      "Requiring perfect historical understanding can become an excuse for indefinite delay. Investigation should be proportionate to risk.",
    topics: ["History", "Systems thinking"],
    related: "Second-order effects",
    url: "https://catholiclibrary.org/library/view?chunk.id=00000011&docId=%2FContemporary-EN%2FXCT.165.html",
    source: "The Thing · The Drift from Domesticity",
    publisher: "G. K. Chesterton",
    keywords: ["rule", "reason", "problem", "remove"],
  },
  {
    title: "Network effects",
    sentence:
      "The usefulness of a system can change as the number and composition of its users change.",
    explanation:
      "A network effect occurs when another participant changes the value of joining. A communication tool is more useful when people you need to contact use it. The effect depends on relevant connections, not merely a large headcount. Growth can also bring congestion or noise. When evaluating a network, ask which participants benefit one another, what interactions create value, and whether that value survives changes in scale or composition.",
    mechanism:
      "Users create external benefits or costs for other users through compatibility, matching, shared infrastructure, or congestion.",
    example:
      "A file format becomes convenient when collaborators can all read it with their existing tools.",
    limitation:
      "A large network can still be poor quality; switching costs and market power are distinct from useful network effects.",
    topics: ["Technology", "Economics"],
    related: "Path dependence",
    url: "https://www.aeaweb.org/articles?id=10.1257/jep.8.2.93",
    source: "Systems Competition and Network Effects",
    publisher: "American Economic Association",
    keywords: ["users", "value", "network", "connection"],
  },
  {
    title: "Information bottleneck",
    sentence:
      "A good representation keeps information relevant to a task while discarding unnecessary detail.",
    explanation:
      "Compression is useful when it preserves what a later decision needs. An information bottleneck formalizes the tension between making a representation small and retaining predictive information about a target. A summary of a paper might retain the mechanism and limitation while dropping the narrative introduction. The choice of target matters: a summary suitable for deciding whether to read a paper may be inadequate for reproducing its experiment.",
    mechanism:
      "The objective trades off information retained about the input with information preserved about a relevant output variable.",
    example:
      "A weather alert keeps location, severity, and timing while omitting most raw sensor readings.",
    limitation:
      "The target determines relevance. Compression that serves one task may discard evidence needed for another.",
    topics: ["AI", "Computer science"],
    related: "Map and territory",
    url: "https://arxiv.org/abs/physics/0004057",
    source: "The Information Bottleneck Method",
    publisher: "arXiv",
    keywords: ["compress", "relevant", "task", "information"],
  },
  {
    title: "Feedback loops",
    sentence:
      "A system’s output can alter its next input, amplifying or correcting change.",
    explanation:
      "In a reinforcing loop, a change creates conditions that produce more change in the same direction. In a balancing loop, a change produces a response that pushes back. Neither label means good or bad: a reinforcing loop can spread useful learning or harmful panic, while a balancing loop can stabilize temperature or resist necessary reform. Trace the loop and its delays before predicting whether an intervention will settle smoothly or overshoot.",
    mechanism:
      "Outputs re-enter the causal chain as inputs. The loop’s sign and timing shape stability, oscillation, and growth.",
    example:
      "A thermostat corrects a temperature difference, but a long delay can make an overly aggressive controller oscillate.",
    limitation:
      "Real systems contain several interacting loops; a single loop diagram is usually a simplification.",
    topics: ["Science", "Systems thinking"],
    related: "Emergence",
    url: "https://fbsbook.org/",
    source: "Feedback Systems",
    publisher: "Åström and Murray",
    keywords: ["output", "input", "loop", "delay"],
  },
  {
    title: "Constraints and creativity",
    sentence:
      "A useful constraint reduces the search space and can make new combinations easier to discover.",
    explanation:
      "Unlimited options can make it hard to decide where to start. A constraint removes some possibilities and invites exploration of the remaining ones. A poet working within a form or a designer working with limited materials has a more specific problem to solve. The constraint helps when it directs attention toward useful experiments. It becomes harmful when it rules out necessary solutions or exists only because an old assumption went unexamined.",
    mechanism:
      "A smaller search space changes which combinations are reachable and how easily candidates can be compared. Constraints can act as prompts for recombination.",
    example:
      "Designing a useful page with only two type sizes forces decisions about grouping, spacing, and emphasis.",
    limitation:
      "Constraint does not guarantee creativity, and excessive restrictions can eliminate the possibilities that matter.",
    topics: ["Creativity", "Design"],
    related: "Exploration and exploitation",
    url: "https://doi.org/10.1177/0149206318805832",
    source: "Creativity and Innovation Under Constraints",
    publisher: "Journal of Management",
    keywords: ["constraint", "search", "options", "combin"],
  },
];

export function createSeedStore(): Store {
  const sources: Source[] = seeds.map((seed, index) => ({
    id: `source-${index + 1}`,
    type: "seed",
    title: seed.source,
    url: seed.url,
    publisher: seed.publisher,
    rawText: `Editorial source note — original paraphrase, not a quotation.\n\n${seed.explanation}\n\n${seed.mechanism}\n\nExample constructed for this app: ${seed.example}\n\nLimitation: ${seed.limitation}`,
    createdAt,
  }));
  const ideas: Idea[] = seeds.map((seed, index) => ({
    id: `idea-${index + 1}`,
    sourceId: sources[index].id,
    title: seed.title,
    oneSentence: seed.sentence,
    shortExplanation: seed.explanation,
    deeperExplanation: seed.mechanism,
    whyItMatters: `Use this idea when examining ${seed.topics[0].toLowerCase()} questions. ${seed.sentence} Try applying it to one concrete decision before accepting a general explanation.`,
    example: seed.example,
    counterpoint: seed.limitation,
    concepts: [seed.title, seed.related],
    topics: seed.topics,
    sourceQuality: 0.85,
    depthScore: 0.85,
    interpretation: "editorial",
    createdAt,
    recall: {
      question: `Which sentence best captures ${seed.title.toLowerCase()}?`,
      options: [
        seed.sentence,
        "The most visible examples always provide the best evidence.",
        "A useful explanation needs no limits or counterexamples.",
      ],
      answer: 0,
      keywords: seed.keywords,
    },
  }));
  // Rotate answer positions to avoid teaching an answer-position shortcut.
  for (let index = 0; index < ideas.length; index++) {
    const recall = ideas[index].recall!;
    const position = index % 3;
    const correct = recall.options.shift()!;
    recall.options.splice(position, 0, correct);
    recall.answer = position;
  }
  return {
    schemaVersion: 1,
    sources,
    ideas,
    states: [],
    concepts: [],
    sessions: [],
    events: [],
    settings: {
      defaultMinutes: 10,
      enoughSensitivity: "conservative",
      topicWeights: Object.fromEntries(TOPICS.map((topic) => [topic, 0])),
      theme: "system",
    },
  };
}
