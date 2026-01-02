# Context Graph Vision

## Core Insight

Context Graphs are NOT graph databases. They're an architectural approach combining:

1. **Context Engineering** - Providing exact relevant information to avoid hallucinations
2. **Decision Graphs** - Dynamic graphs agents build as they work, recording WHY decisions were made

## The Key Differentiator

> "You have the state (the current text), but you've lost the reasoning."

Traditional systems (CRMs, databases) store **state**. Context Graphs store **decision traces** - the reasoning behind each decision.

## From Systems of Record → Systems of Reasoning

| Traditional (CRM) | Context Graph |
|-------------------|---------------|
| Stores current state | Stores decision traces |
| Fields get overwritten | Context accumulates |
| "What happened?" | "Why did it happen?" |
| Passive data storage | Active reasoning system |
| Flat keywords | Weighted, hierarchical context |

## Key Architectural Elements

### 1. Grounding Truth
- Start with organizational capabilities, goals, constraints
- Decisions are compared against this foundation

### 2. Source Weighting
- Not all context is equal
- Decision-maker input > Individual contributor input
- Recent context > Old context
- Verified facts > Inferences

### 3. Capability Matching
- Auto-link decisions to what the org can/can't do
- Flag misalignments (asking for something we can't deliver)

### 4. Decision Traces
- Not just WHAT was decided, but:
  - WHO influenced it (sources)
  - WHY it was decided (reasoning)
  - WHAT it connects to (dependencies)

### 5. Pattern Discovery
- Analyze decision graphs across instances
- Find emergent patterns humans miss
- "When X → Y, deals close 40% faster"

## Product Direction Ideas

### Current Capabilities
- ✅ Decision logging with context
- ✅ Human override capture
- ✅ Policy extraction from overrides
- ✅ Semantic search across decisions

### Potential Enhancements

**1. Richer Decision Model**
```python
cg.decisions.create(
    agent_id="sales-agent",
    action_taken="Prioritized forecasting over CRM updates",
    confidence=0.9,
    reasoning="Michael (decision-maker) needs 90%+ forecast accuracy for IPO",
    sources=[
        {"type": "meeting", "participant": "Michael", "weight": 0.9},
        {"type": "meeting", "participant": "Jim", "weight": 0.4}
    ],
    linked_capabilities=["forecasting"],
    context_snapshot={...}
)
```

**2. Organizational Grounding**
- Define org capabilities, goals, constraints
- Decisions auto-linked to relevant capabilities
- Dashboard shows capability coverage gaps

**3. Decision Graph Visualization**
- See how decisions connect over time
- Trace back from outcome to root decisions
- Identify bottlenecks and patterns

**4. Source Attribution & Weighting**
- Track who/what provided context
- Build org hierarchies (decision-maker > IC)
- Weight context by source authority

**5. Pattern Mining**
- "Deals with early forecasting demos close 40% faster"
- "When confidence < 0.7, human override rate is 3x"
- Surface these insights automatically

## Positioning

**Not:** "AI that fills out your CRM fields"
**But:** "Memory and reasoning for your AI agents"

**The promise:** Your agents don't just execute tasks - they build institutional knowledge that makes future decisions better.

---

*Source: Foundation Capital article on Context Graphs*
