document.addEventListener("DOMContentLoaded", () => {
  const pages = Array.from(document.querySelectorAll(".page"));
  let currentPage = 0;

  function showPage(index) {
    if (index < 0 || index >= pages.length) return;

    pages.forEach((page) => {
      page.classList.remove("active");
    });

    pages[index].classList.add("active");
    currentPage = index;
    window.scrollTo(0, 0);
  }

  document.querySelectorAll(".next-button").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(currentPage + 1);
    });
  });

  document.querySelectorAll(".back-button").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(currentPage - 1);
    });
  });

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
    if (value.trim() === "") return true;
    if (isNA(value)) return true;

    const score = Number(value);
    return Number.isInteger(score) && score >= 0 && score <= 4;
  }

  function calculateQuestionnaire(questionnaire) {
    const scoreInputs = questionnaire.querySelectorAll(".domain-score");

    const totalDomainScoreInput = questionnaire.querySelector(".total-domain-score");
    const questionsAnsweredInput = questionnaire.querySelector(".questions-answered");
    const controlScoreInput = questionnaire.querySelector(".control-score");
    const nonNaCountInput = questionnaire.querySelector(".non-na-count");
    const engagementScoreInput = questionnaire.querySelector(".engagement-score");

    let totalDomainScore = 0;
    let questionsAnswered = 0;

    scoreInputs.forEach((input) => {
      const value = input.value.trim();

      input.classList.remove("input-error");

      if (!isValidScore(value)) {
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
      totalQuestionsInDomain > 0
        ? questionsAnswered / totalQuestionsInDomain
        : "";

    if (totalDomainScoreInput) {
      totalDomainScoreInput.value = questionsAnswered > 0 ? totalDomainScore : "";
    }

    if (questionsAnsweredInput) {
      questionsAnsweredInput.value = questionsAnswered > 0 ? questionsAnswered : "";
    }

    if (controlScoreInput) {
      controlScoreInput.value = controlScore === "" ? "" : controlScore.toFixed(2);
    }

    if (nonNaCountInput) {
      nonNaCountInput.value = questionsAnswered > 0 ? questionsAnswered : "";
    }

    if (engagementScoreInput) {
      engagementScoreInput.value =
        engagementScore === "" ? "" : engagementScore.toFixed(2);
    }
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

  showPage(0);
});