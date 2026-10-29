---
# The About page and the CV it prints, in the order the page shows them. Edit
# this file directly. The build checks it against the `cv` schema in
# src/content.config.ts and names any field it rejects.
#
# Wrap a one-line value in double quotes if it contains ": " or " #", or starts
# with a quote, [, {, &, * or !. Example: headline: "Design: systems and code"
#
# The summary is Markdown under `summary: |`. Indent every line by two spaces;
# inside it, colons and quotes need no escaping. Blank lines make paragraphs,
# "- " lines make a bulleted list.

# Shown under your name as one line: "Leiria, Portugal / Fluent in Portuguese &
# English". List only languages you're fluent in, by name alone.
location: Leiria, Portugal
languages:
  - Portuguese
  - English

headline: "Senior Product Designer & Design Engineer"

summary: |
  I specialize in building interfaces for complex technical software: observability, databases, and developer tools. It’s a world I navigate with ease. I know its terminology, its workflows, and I understand the people who use these tools every day: DBAs, SREs and software developers.

  How I work:
  
  - Research first. Understanding real users and workflows is crucial. From diagrams to high-fidelity coded prototypes, I use whatever it takes to align teams and leadership on what to build.
  - Design systems in code. I write production front-end code, so design and engineering work from the same source and share the same intent.
  - Reviews that unblock teams. When teams ship fast, I turn UX findings into clear, actionable issue notes that anyone can pick up, so they can meet the deadline and still ship with quality.

experience:
  - role: Senior Product Designer
    org: Percona
    period: August 2022 — October 2026
    summary: Percona builds open-source database software and services, including PMM (Percona Monitoring and Management), a monitoring and observability platform for MySQL, PostgreSQL, MongoDB, Redis, and more.
    points:
      - Designed and coded a native UI for PMM, decoupling the interface from heavy third-party dependencies to reduce technical debt and unblock the development of custom features.
      - Built and managed Peak UI, the front-end component and style foundation that streamlined development and enabled extensibility across Percona products.
      - Created high-fidelity vision prototypes grounded in user research with DBAs, SREs and developers to resolve core workflow issues, securing executive buy-in and driving product adoption.
      - Audited the user journey to PMM adoption, identified documentation as a key gap, and redesigned and coded modular templates across 10+ documentation sites, improving readability and simplifying content creation.
      - Mentored designers and engineers on front-end code practices, design system patterns, and research methods.

  - role: Senior Product Designer
    org: FARFETCH
    period: June 2021 — July 2022
    summary: FARFETCH is a global marketplace for luxury fashion. I worked on catalog and product discovery, including conscious, or eco-friendly, shopping.
    points:
      - Uncovered catalog discovery barriers through user research, using the insights to shape the conscious shopping roadmap.
      - Created a taxonomy framework for sustainable items, resolving catalog inconsistencies, making complex product attributes clearer, and documenting standards shared across departments.
      - Redesigned product listing cards to enable direct purchasing from catalog pages, removing friction in the checkout funnel and improving product discovery.
      - Built modular component patterns that balanced high-end luxury aesthetics with strict functional e-commerce requirements.

  - role: Senior Product Designer
    org: TUI Group
    period: March 2019 — May 2021
    summary: TUI Group is one of the world’s largest leisure travel companies. From the Lisbon hub, I worked on its e-commerce experience across multiple markets.
    points:
      - Designed a modular page-building system that generated 100K+ destination pages, driving 4x organic traffic growth and simplifying multi-market deployment.
      - Created the Tagus design system across 5 global markets, standardizing e-commerce flows from inspiration through checkout.
      - Managed front-end QA with external development teams to keep implementation true to the design.
      - Validated interface patterns using A/B testing and Baymard UX benchmarking before scaling features across distributed European teams.
      - Built vision prototypes to align international product strategy, helping grow the Lisbon hub’s influence within the group.

  - role: User Experience Designer
    org: SMARTIDIOM
    period: May 2016 — March 2019
    summary: SMARTIDIOM is a translation services company. I led the design and front-end of its move from a traditional service business to a digital platform.
    points:
      - Designed and coded 4 interconnected web applications, turning a traditional service business into a digital platform that connects clients with certified professionals.
      - Built Slayout, a UI component system created from scratch to standardize interface patterns across complex workflows, including calendar scheduling, financial tracking, bidding systems, and onboarding flows.
      - Created high-fidelity product demonstrations and front-end builds showcased at CES 2017 to validate market demand and platform capabilities.

# Older or side jobs, one short line each: no bullet points.
earlierWork:
  - role: Founder & Designer
    org: Noise Goods
    period: 2013 — 2019
    summary: "Founded and ran a bag brand end to end, from product design and manufacturing to a self-coded online store selling to 50+ countries."

  - role: Product Designer
    org: Stricker
    period: 2010 — 2013
    summary: "Designed modular systems for 50+ B2B products and structured their digital catalogues, with extensive field research at trade shows."

  - role: Illustrator & Graphic Designer
    org: Freelance
    period: 2009 — 2011
    summary: "Editorial illustration for Visão, DIFF and Lux Woman, brand identities with systematic guidelines, and my first web layouts in code."

  - role: Industrial Designer
    org: COMOPI
    period: 2007 — 2009
    summary: "Designed modular kitchen systems from concept to production, scripting CAD workflows to automate the handoff to manufacturing."

education:
  - title: Master’s Degree, Industrial and Product Design
    org: Escola Universitária das Artes de Coimbra
    period: 2002 — 2007

# Not shown on the page. Search engines read it from the page's structured data.
skills:
  - Design Systems
  - User Research
  - Front-end Development
  - User Interface Design
  - Enterprise UX
---
