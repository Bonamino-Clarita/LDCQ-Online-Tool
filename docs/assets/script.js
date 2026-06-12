document.addEventListener("DOMContentLoaded", () => {
  const pages = Array.from(document.querySelectorAll(".page"));
  let currentPage = 0;

  function isNA(value) {
    const cleaned = value.trim().toLowerCase();

    return (
      cleaned === "n.a." ||
      cleaned === "n.a" ||
      cleaned === "na" ||
      cleaned === "n/a" ||
      cleaned === "not applicable"
    );
  }

  function isValidScore(value) {
    const cleaned = value.trim();

    if (cleaned === "") return false;
    if (isNA(cleaned)) return true;

    const score = Number(cleaned);
    return Number.isInteger(score) && score >= 0 && score <= 4;
  }

  function showPage(index) {
    if (index < 0 || index >= pages.length) return;

    pages.forEach((page) => {
      page.classList.remove("active");
    });

    pages[index].classList.add("active");
    currentPage = index;
    window.scrollTo(0, 0);

    const mainTitle = document.getElementById("main-title");

    if (mainTitle) {
      if (pages[index].classList.contains("results-page")) {
        mainTitle.style.display = "none";
      } else {
        mainTitle.style.display = "block";
      }
    }

    updateNextButtonState(pages[index]);

    if (pages[index].classList.contains("results-page")) {
      renderSpiderChart();
    }
  }

  function updateNextButtonState(page) {
    if (!page.classList.contains("questionnaire")) return;

    const nextButton = page.querySelector(".next-button");
    const inputs = page.querySelectorAll(".domain-score");

    if (!nextButton) return;

    const allFilled = Array.from(inputs).every((input) => {
      return isValidScore(input.value);
    });

    nextButton.disabled = !allFilled;
  }

  document.querySelectorAll(".next-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      showPage(currentPage + 1);
    });
  });

  document.querySelectorAll(".back-button").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(currentPage - 1);
    });
  });

  function calculateQuestionnaire(questionnaire) {
    const scoreInputs = questionnaire.querySelectorAll(".domain-score");

    const totalDomainScoreInput = questionnaire.querySelector(
      ".total-domain-score, #total-domain-score"
    );

    const questionsAnsweredInput = questionnaire.querySelector(
      ".questions-answered, #questions-answered"
    );

    const controlScoreInput = questionnaire.querySelector(
      ".control-score, #control-score"
    );

    const nonNaCountInput = questionnaire.querySelector(
      ".non-na-count, #non-na-count"
    );

    const engagementScoreInput = questionnaire.querySelector(
      ".engagement-score, #engagement-score"
    );

    let totalDomainScore = 0;
    let questionsAnswered = 0;

    scoreInputs.forEach((input) => {
      const value = input.value.trim();

      input.classList.remove("input-error");

      if (value !== "" && !isValidScore(value)) {
        input.classList.add("input-error");
        return;
      }

      if (value === "" || isNA(value)) {
        return;
      }

      totalDomainScore += Number(value);
      questionsAnswered += 1;
    });

    const totalQuestionsInDomain = scoreInputs.length;

    const controlScore =
      questionsAnswered > 0
        ? totalDomainScore / (questionsAnswered * 4)
        : "";

    const engagementScore =
      questionsAnswered > 0 && totalQuestionsInDomain > 0
        ? questionsAnswered / totalQuestionsInDomain
        : "";
        
    if (totalDomainScoreInput) {
      totalDomainScoreInput.value =
        questionsAnswered > 0 ? totalDomainScore : "";
    }

    if (questionsAnsweredInput) {
      questionsAnsweredInput.value =
        questionsAnswered > 0 ? questionsAnswered : "";
    }

    if (controlScoreInput) {
      controlScoreInput.value =
        controlScore === "" ? "" : controlScore.toFixed(2);
    }

    if (nonNaCountInput) {
      nonNaCountInput.value =
        questionsAnswered > 0 ? questionsAnswered : "";
    }

    if (engagementScoreInput) {
      engagementScoreInput.value =
        engagementScore === "" ? "" : engagementScore.toFixed(2);
    }

    updateNextButtonState(questionnaire);
  }

  const questionnaires = document.querySelectorAll(".questionnaire");

  questionnaires.forEach((questionnaire) => {
    const scoreInputs = questionnaire.querySelectorAll(".domain-score");

    scoreInputs.forEach((input) => {
      input.addEventListener("input", () => {
        calculateQuestionnaire(questionnaire);
      });
    });

    calculateQuestionnaire(questionnaire);
  });

  const domainLabels = {
    "own-cognition": "Cognition",
    "own-emotion": "Emotion",
    "own-body": "Body",
    "own-movement": "Movement",
    "dream-characters": "Characters",
    "dream-environment": "Environment",
    "dream-physics": "Physics"
  };

  const domainOrder = [
    "own-cognition",
    "own-emotion",
    "own-body",
    "own-movement",
    "dream-characters",
    "dream-environment",
    "dream-physics"
  ];

  function getQuestionnaireScores(questionnaire) {
    const scoreInputs = questionnaire.querySelectorAll(".domain-score");

    let totalDomainScore = 0;
    let questionsAnswered = 0;

    scoreInputs.forEach((input) => {
      const value = input.value.trim();

      if (value === "" || isNA(value) || !isValidScore(value)) {
        return;
      }

      totalDomainScore += Number(value);
      questionsAnswered += 1;
    });

    const totalQuestionsInDomain = scoreInputs.length;

    const controlScore =
      questionsAnswered > 0
        ? totalDomainScore / (questionsAnswered * 4)
        : 0;

    const engagementScore =
      totalQuestionsInDomain > 0
        ? questionsAnswered / totalQuestionsInDomain
        : 0;

    return {
      control: controlScore,
      engagement: engagementScore
    };
  }

  function getAllDomainScores() {
    const scores = {};

    document.querySelectorAll(".questionnaire").forEach((questionnaire) => {
      const domain = questionnaire.dataset.domain;

      if (!domain) return;

      scores[domain] = getQuestionnaireScores(questionnaire);
    });

    return domainOrder.map((domain) => {
      const score = scores[domain] || { control: 0, engagement: 0 };

      return {
        domain,
        label: domainLabels[domain],
        control: score.control,
        engagement: score.engagement
      };
    });
  }

  function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);

    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    return element;
  }

  function pointsForValues(values, centerX, centerY, radius) {
    const total = values.length;

    return values
      .map((value, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
        const r = radius * value;

        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        return `${x},${y}`;
      })
      .join(" ");
  }

  function renderSpiderChart() {
    const container = document.getElementById("spider-chart");
    if (!container) return;

    const data = getAllDomainScores();

    const labels = data.map((item) => item.label);
    const engagementValues = data.map((item) => item.engagement);
    const controlValues = data.map((item) => item.control);

    const width = 900;
    const height = 820;
    const centerX = width / 2;
    const centerY = 470;
    const radius = 220;
    const levels = 5;

    container.innerHTML = "";

    const svg = createSvgElement("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: width,
      height: height,
      role: "img",
      "aria-label": "Dream Control Profile radar chart"
    });

    // Title
    const title = createSvgElement("text", {
      x: centerX,
      y: 45,
      "text-anchor": "middle",
      class: "chart-title"
    });
    title.textContent = "Dream Control Profile";
    svg.appendChild(title);

    const subtitle = createSvgElement("text", {
      x: centerX,
      y: 90,
      "text-anchor": "middle",
      class: "chart-subtitle"
    });
    subtitle.textContent = "Engagement and Control";
    svg.appendChild(subtitle);

    // Legend
    svg.appendChild(
      createSvgElement("circle", {
        cx: centerX - 170,
        cy: 140,
        r: 14,
        fill: "#bdbdbd"
      })
    );

    const engagementLegend = createSvgElement("text", {
      x: centerX - 140,
      y: 148,
      class: "chart-legend"
    });
    engagementLegend.textContent = "Engagement";
    svg.appendChild(engagementLegend);

    svg.appendChild(
      createSvgElement("circle", {
        cx: centerX + 70,
        cy: 140,
        r: 14,
        fill: "#555"
      })
    );

    const controlLegend = createSvgElement("text", {
      x: centerX + 100,
      y: 148,
      class: "chart-legend"
    });
    controlLegend.textContent = "Control";
    svg.appendChild(controlLegend);

    // Grid
    for (let level = 1; level <= levels; level++) {
      const value = level / levels;

      const grid = createSvgElement("polygon", {
        points: pointsForValues(
          new Array(labels.length).fill(value),
          centerX,
          centerY,
          radius
        ),
        fill: "none",
        stroke: "#bdbdbd",
        "stroke-width": "3",
        "stroke-dasharray": "12 10"
      });

      svg.appendChild(grid);
    }

    // Axis lines
    labels.forEach((label, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / labels.length;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      const axis = createSvgElement("line", {
        x1: centerX,
        y1: centerY,
        x2: x,
        y2: y,
        stroke: "#bdbdbd",
        "stroke-width": "3"
      });

      svg.appendChild(axis);
    });

    // Tick labels
    for (let level = 0; level <= levels; level++) {
      const value = level / levels;
      const y = centerY - radius * value;

      const tick = createSvgElement("text", {
        x: centerX + 12,
        y: y + 7,
        class: "chart-tick"
      });

      tick.textContent = value.toFixed(1);
      svg.appendChild(tick);
    }

    // Engagement polygon
    const engagementPolygon = createSvgElement("polygon", {
      points: pointsForValues(engagementValues, centerX, centerY, radius),
      fill: "rgba(190, 190, 190, 0.55)",
      stroke: "#bdbdbd",
      "stroke-width": "4"
    });

    svg.appendChild(engagementPolygon);

    // Control polygon
    const controlPolygon = createSvgElement("polygon", {
      points: pointsForValues(controlValues, centerX, centerY, radius),
      fill: "rgba(80, 80, 80, 0.55)",
      stroke: "#555",
      "stroke-width": "4"
    });

    svg.appendChild(controlPolygon);

    // Labels around chart
    labels.forEach((label, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / labels.length;
      const labelRadius = radius + 70;

      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;

      const text = createSvgElement("text", {
        x,
        y,
        "text-anchor": "middle",
        "dominant-baseline": "middle",
        class: "chart-label"
      });

      text.textContent = label;
      svg.appendChild(text);
    });

    container.appendChild(svg);
  }

  showPage(0);
});