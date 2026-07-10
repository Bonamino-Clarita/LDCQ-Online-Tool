"use strict";

/* =========================================================
   PDF REPORT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const downloadButton = document.getElementById(
        "download-pdf-button"
    );

    if (!downloadButton) {
        return;
    }

    downloadButton.addEventListener(
        "click",
        generateQuestionnairePdf
    );
});


async function generateQuestionnairePdf() {
    const downloadButton = document.getElementById(
        "download-pdf-button"
    );

    const originalButtonText = downloadButton
        ? downloadButton.textContent
        : "Download PDF report";

    try {
        if (!window.jspdf?.jsPDF) {
            throw new Error("jsPDF has not been loaded.");
        }

        if (typeof window.html2canvas !== "function") {
            throw new Error("html2canvas has not been loaded.");
        }

        if (downloadButton) {
            downloadButton.disabled = true;
            downloadButton.textContent = "Creating PDF...";
        }

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        pdf.setProperties({
            title: "Lucid Dream Control Questionnaire Report",
            subject: "LDCQ questionnaire answers and scores",
            creator: "LDCQ Online Tool"
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 17;
        const footerHeight = 14;
        const contentWidth = pageWidth - margin * 2;
        const bottomLimit = pageHeight - footerHeight;

        let y = 18;

        function normalisePdfText(value) {
            return String(value ?? "")
                .replace(/\u00a0/g, " ")
                .replace(/[“”]/g, "\"")
                .replace(/[‘’]/g, "'")
                .replace(/…/g, "...")
                .replace(/[–—]/g, "-")
                .replace(/\s+/g, " ")
                .trim();
        }

        function addNewPage() {
            pdf.addPage();
            y = 18;
        }

        function ensureSpace(requiredHeight = 8) {
            if (y + requiredHeight > bottomLimit) {
                addNewPage();
            }
        }

        function addWrappedText(
            text,
            {
                fontSize = 10.5,
                fontStyle = "normal",
                indent = 0,
                lineHeight = 5,
                spaceAfter = 2
            } = {}
        ) {
            const cleanText = normalisePdfText(text);

            if (!cleanText) {
                return;
            }

            pdf.setFont("times", fontStyle);
            pdf.setFontSize(fontSize);

            const lines = pdf.splitTextToSize(
                cleanText,
                contentWidth - indent
            );

            lines.forEach((line) => {
                ensureSpace(lineHeight);

                pdf.text(
                    line,
                    margin + indent,
                    y
                );

                y += lineHeight;
            });

            y += spaceAfter;
        }

        function addSectionHeading(text) {
            ensureSpace(14);

            pdf.setFont("times", "bold");
            pdf.setFontSize(15);

            pdf.text(
                normalisePdfText(text),
                margin,
                y
            );

            y += 3;

            pdf.setLineWidth(0.25);
            pdf.line(
                margin,
                y,
                pageWidth - margin,
                y
            );

            y += 7;
        }

        function getInputValue(section, selector) {
            const input = section.querySelector(selector);

            if (!input) {
                return "-";
            }

            const value = normalisePdfText(input.value);

            return value || "-";
        }

        const questionnaireSections = Array.from(
            document.querySelectorAll(
                ".page.questionnaire[data-domain]"
            )
        );

        /*
         * Title
         */
        pdf.setFont("times", "bold");
        pdf.setFontSize(21);

        pdf.text(
            "Lucid Dream Control Questionnaire",
            pageWidth / 2,
            y,
            {
                align: "center"
            }
        );

        y += 9;

        pdf.setFontSize(16);

        pdf.text(
            "Results Report",
            pageWidth / 2,
            y,
            {
                align: "center"
            }
        );

        y += 8;

        const reportDate = new Date().toLocaleString(
            undefined,
            {
                dateStyle: "long",
                timeStyle: "short"
            }
        );

        pdf.setFont("times", "normal");
        pdf.setFontSize(9.5);

        pdf.text(
            `Generated: ${normalisePdfText(reportDate)}`,
            pageWidth / 2,
            y,
            {
                align: "center"
            }
        );

        y += 11;

        /*
         * Domain score summary
         */
        addSectionHeading("Domain Score Summary");

        questionnaireSections.forEach((section) => {
            const domainTitle =
                section.querySelector("h2")?.textContent ||
                section.dataset.domain ||
                "Domain";

            const controlScore = getInputValue(
                section,
                ".control-score"
            );

            const engagementScore = getInputValue(
                section,
                ".engagement-score"
            );

            ensureSpace(7);

            pdf.setFont("times", "bold");
            pdf.setFontSize(10);

            pdf.text(
                normalisePdfText(domainTitle),
                margin,
                y
            );

            pdf.setFont("times", "normal");

            pdf.text(
                `Control: ${controlScore}    Engagement: ${engagementScore}`,
                pageWidth - margin,
                y,
                {
                    align: "right"
                }
            );

            y += 6;
        });

        y += 3;

        /*
         * Spider plot
         */
        const chartElement = document.getElementById(
            "spider-chart"
        );

        if (
            chartElement &&
            chartElement.children.length > 0
        ) {
            addSectionHeading("Score Plot");

            const chartCanvas = await html2canvas(
                chartElement,
                {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    useCORS: true,
                    logging: false
                }
            );

            const imageData = chartCanvas.toDataURL(
                "image/png",
                1
            );

            let imageWidth = contentWidth;
            let imageHeight =
                imageWidth *
                (chartCanvas.height / chartCanvas.width);

            const maximumHeight = 105;

            if (imageHeight > maximumHeight) {
                imageHeight = maximumHeight;

                imageWidth =
                    imageHeight *
                    (chartCanvas.width / chartCanvas.height);
            }

            ensureSpace(imageHeight + 5);

            const imageX =
                margin +
                (contentWidth - imageWidth) / 2;

            pdf.addImage(
                imageData,
                "PNG",
                imageX,
                y,
                imageWidth,
                imageHeight,
                undefined,
                "FAST"
            );

            y += imageHeight + 5;
        }

        /*
         * Individual questionnaire domains
         */
        questionnaireSections.forEach((section) => {
            addNewPage();

            const domainTitle =
                section.querySelector("h2")?.textContent ||
                section.dataset.domain ||
                "Questionnaire Domain";

            addSectionHeading(domainTitle);

            const totalDomainScore = getInputValue(
                section,
                ".total-domain-score"
            );

            const questionsAnswered = getInputValue(
                section,
                ".questions-answered"
            );

            const nonNaCount = getInputValue(
                section,
                ".non-na-count"
            );

            const controlScore = getInputValue(
                section,
                ".control-score"
            );

            const engagementScore = getInputValue(
                section,
                ".engagement-score"
            );

            addWrappedText(
                `Total domain score: ${totalDomainScore}`,
                {
                    spaceAfter: 1
                }
            );

            addWrappedText(
                `Questions answered: ${questionsAnswered}`,
                {
                    spaceAfter: 1
                }
            );

            addWrappedText(
                `Questions not marked N.A.: ${nonNaCount}`,
                {
                    spaceAfter: 1
                }
            );

            addWrappedText(
                `Control score: ${controlScore}`,
                {
                    fontStyle: "bold",
                    spaceAfter: 1
                }
            );

            addWrappedText(
                `Engagement score: ${engagementScore}`,
                {
                    fontStyle: "bold",
                    spaceAfter: 6
                }
            );

            const questionRows = Array.from(
                section.querySelectorAll(
                    ".score-table tbody tr"
                )
            );

            questionRows.forEach((row, index) => {
                const cells = row.querySelectorAll("td");

                const number =
                    normalisePdfText(
                        cells[0]?.textContent
                    ) || `${index + 1}.`;

                const question = normalisePdfText(
                    cells[1]?.textContent
                );

                const answerInput = row.querySelector(
                    ".domain-score"
                );

                const answer = normalisePdfText(
                    answerInput?.value
                ) || "Not answered";

                addWrappedText(
                    `${number} ${question}`,
                    {
                        fontStyle: "bold",
                        spaceAfter: 1
                    }
                );

                addWrappedText(
                    `Answer: ${answer}`,
                    {
                        indent: 5,
                        spaceAfter: 4
                    }
                );
            });
        });

        /*
         * Page numbers
         */
        const pageCount = pdf.getNumberOfPages();

        for (
            let pageNumber = 1;
            pageNumber <= pageCount;
            pageNumber += 1
        ) {
            pdf.setPage(pageNumber);

            pdf.setFont("times", "normal");
            pdf.setFontSize(8.5);

            pdf.text(
                `Page ${pageNumber} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 7,
                {
                    align: "center"
                }
            );
        }

        const now = new Date();

        const fileDate = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("-");

        pdf.save(`LDCQ-report-${fileDate}.pdf`);
    } catch (error) {
        console.error(
            "PDF report generation failed:",
            error
        );

        alert(
            "The PDF report could not be created. " +
            "Open the browser console for more information."
        );
    } finally {
        if (downloadButton) {
            downloadButton.disabled = false;
            downloadButton.textContent =
                originalButtonText.trim();
        }
    }
}