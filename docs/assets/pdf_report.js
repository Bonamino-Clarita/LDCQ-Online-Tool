"use strict";

/* =========================================================
   CHART IMAGE HELPERS
   ========================================================= */

/*
 * Creates a PNG from a canvas while adding a white background.
 * This prevents transparent areas from appearing black in some
 * PDF viewers.
 */
function createWhiteCanvasImage(sourceCanvas) {
    const canvas = document.createElement("canvas");

    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;

    const context = canvas.getContext("2d");

    if (!context) {
        throw new Error(
            "Could not create a canvas for the chart image."
        );
    }

    context.fillStyle = "#ffffff";
    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.drawImage(sourceCanvas, 0, 0);

    return {
        dataUrl: canvas.toDataURL("image/png", 1),
        width: canvas.width,
        height: canvas.height
    };
}


/*
 * Loads an image and returns a Promise that resolves when
 * loading is complete.
 */
function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => {
            resolve(image);
        };

        image.onerror = () => {
            reject(
                new Error(
                    "The SVG spider chart could not be converted."
                )
            );
        };

        image.src = source;
    });
}


/*
 * Copies computed styles from the original SVG to a cloned SVG.
 * This helps preserve colours, fonts, lines and labels when the
 * SVG is converted into an image.
 */
function copySvgStyles(sourceSvg, clonedSvg) {
    const sourceElements = [
        sourceSvg,
        ...sourceSvg.querySelectorAll("*")
    ];

    const clonedElements = [
        clonedSvg,
        ...clonedSvg.querySelectorAll("*")
    ];

    sourceElements.forEach((sourceElement, index) => {
        const clonedElement = clonedElements[index];

        if (!clonedElement) {
            return;
        }

        const computedStyle =
            window.getComputedStyle(sourceElement);

        let styleText = "";

        for (
            let propertyIndex = 0;
            propertyIndex < computedStyle.length;
            propertyIndex += 1
        ) {
            const propertyName =
                computedStyle[propertyIndex];

            const propertyValue =
                computedStyle.getPropertyValue(
                    propertyName
                );

            styleText +=
                `${propertyName}:${propertyValue};`;
        }

        clonedElement.setAttribute(
            "style",
            styleText
        );
    });
}


/*
 * Converts an SVG chart into a PNG image.
 */
async function createSvgImage(sourceSvg) {
    const clonedSvg = sourceSvg.cloneNode(true);

    copySvgStyles(sourceSvg, clonedSvg);

    const boundingBox =
        sourceSvg.getBoundingClientRect();

    const viewBox =
        sourceSvg.viewBox?.baseVal;

    const width = Math.ceil(
        boundingBox.width ||
        sourceSvg.width?.baseVal?.value ||
        viewBox?.width ||
        900
    );

    const height = Math.ceil(
        boundingBox.height ||
        sourceSvg.height?.baseVal?.value ||
        viewBox?.height ||
        600
    );

    clonedSvg.setAttribute(
        "xmlns",
        "http://www.w3.org/2000/svg"
    );

    clonedSvg.setAttribute(
        "width",
        String(width)
    );

    clonedSvg.setAttribute(
        "height",
        String(height)
    );

    if (!clonedSvg.getAttribute("viewBox")) {
        clonedSvg.setAttribute(
            "viewBox",
            `0 0 ${width} ${height}`
        );
    }

    const svgText =
        new XMLSerializer().serializeToString(
            clonedSvg
        );

    const svgBlob = new Blob(
        [svgText],
        {
            type: "image/svg+xml;charset=utf-8"
        }
    );

    const objectUrl =
        URL.createObjectURL(svgBlob);

    try {
        const image = await loadImage(objectUrl);

        const scale = 2;

        const canvas =
            document.createElement("canvas");

        canvas.width = width * scale;
        canvas.height = height * scale;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Could not create a canvas for the SVG chart."
            );
        }

        context.fillStyle = "#ffffff";

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        context.drawImage(
            image,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return {
            dataUrl: canvas.toDataURL(
                "image/png",
                1
            ),
            width: canvas.width,
            height: canvas.height
        };
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}


/*
 * Finds the spider plot inside #spider-chart.
 *
 * Only the canvas or SVG is selected. Any table contained
 * underneath the plot is therefore excluded from the PDF.
 */
async function getSpiderChartImage() {
    const chartContainer =
        document.getElementById(
            "spider-chart"
        );

    if (!chartContainer) {
        throw new Error(
            "The spider chart container was not found."
        );
    }

    const chartCanvas =
        chartContainer.querySelector("canvas");

    if (
        chartCanvas &&
        chartCanvas.width > 0 &&
        chartCanvas.height > 0
    ) {
        return createWhiteCanvasImage(
            chartCanvas
        );
    }

    const chartSvg =
        chartContainer.querySelector("svg");

    if (chartSvg) {
        return createSvgImage(chartSvg);
    }

    throw new Error(
        "No canvas or SVG spider chart was found."
    );
}


/* =========================================================
   PDF BUTTON
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const downloadButton =
            document.getElementById(
                "download-pdf-button"
            );

        if (!downloadButton) {
            return;
        }

        downloadButton.addEventListener(
            "click",
            generateQuestionnairePdf
        );
    }
);


/* =========================================================
   PDF REPORT
   ========================================================= */

async function generateQuestionnairePdf() {
    const downloadButton =
        document.getElementById(
            "download-pdf-button"
        );

    const originalButtonText =
        downloadButton
            ? downloadButton.textContent
            : "Download PDF report";

    try {
        if (!window.jspdf?.jsPDF) {
            throw new Error(
                "jsPDF has not been loaded."
            );
        }

        if (downloadButton) {
            downloadButton.disabled = true;
            downloadButton.textContent =
                "Creating PDF...";
        }

        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true
        });

        pdf.setProperties({
            title:
                "Lucid Dream Control Questionnaire Report",
            subject:
                "LDCQ questionnaire answers and scores",
            creator:
                "LDCQ Online Tool"
        });

        const pageWidth =
            pdf.internal.pageSize.getWidth();

        const pageHeight =
            pdf.internal.pageSize.getHeight();

        const margin = 17;
        const footerHeight = 14;

        const contentWidth =
            pageWidth - margin * 2;

        const bottomLimit =
            pageHeight - footerHeight;

        let y = 24;

        const colours = {
            ink: [22, 33, 42],
            muted: [101, 113, 122],
            accent: [40, 105, 140],
            deep: [23, 63, 86],
            soft: [225, 237, 243],
            paper: [245, 247, 247],
            line: [213, 222, 226],
            white: [255, 255, 255]
        };


        /* -------------------------------------------------
           PDF utility functions
           ------------------------------------------------- */

        function normalisePdfText(value) {
            return String(value ?? "")
                .replace(/\u00a0/g, " ")
                .replace(/â€¦/g, "...")
                .replace(/â€œ|â€/g, "\"")
                .replace(/â€˜|â€™/g, "'")
                .replace(/â€“|â€”/g, "-")
                .replace(/Ã·/g, "/")
                .replace(/[“”]/g, "\"")
                .replace(/[‘’]/g, "'")
                .replace(/…/g, "...")
                .replace(/[–—]/g, "-")
                .replace(/\s+/g, " ")
                .trim();
        }


        function addNewPage() {
            pdf.addPage();
            y = 24;
            addPageChrome();
        }


        function addPageChrome() {
            pdf.setFillColor(...colours.deep);
            pdf.rect(0, 0, pageWidth, 3, "F");

            pdf.setDrawColor(...colours.line);
            pdf.setLineWidth(0.2);
            pdf.line(
                margin,
                pageHeight - footerHeight,
                pageWidth - margin,
                pageHeight - footerHeight
            );
        }


        function ensureSpace(
            requiredHeight = 8
        ) {
            if (
                y + requiredHeight >
                bottomLimit
            ) {
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
            const cleanText =
                normalisePdfText(text);

            if (!cleanText) {
                return;
            }

            pdf.setFont("helvetica", fontStyle);
            pdf.setTextColor(...colours.ink);

            pdf.setFontSize(fontSize);

            const lines =
                pdf.splitTextToSize(
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

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...colours.deep);

            pdf.setFontSize(14.5);

            pdf.text(
                normalisePdfText(text),
                margin,
                y
            );

            y += 3;

            pdf.setDrawColor(...colours.accent);
            pdf.setLineWidth(0.55);

            pdf.line(
                margin,
                y,
                pageWidth - margin,
                y
            );

            y += 7;
        }


        function getInputValue(
            section,
            selector
        ) {
            const input =
                section.querySelector(
                    selector
                );

            if (!input) {
                return "-";
            }

            const value =
                normalisePdfText(
                    input.value
                );

            return value || "-";
        }


        const questionnaireSections =
            Array.from(
                document.querySelectorAll(
                    ".page.questionnaire[data-domain]"
                )
            );

        addPageChrome();


        /* -------------------------------------------------
           Report title
           ------------------------------------------------- */

        pdf.setFillColor(...colours.soft);
        pdf.roundedRect(
            margin,
            13,
            contentWidth,
            42,
            1.5,
            1.5,
            "F"
        );

        y = 26;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colours.deep);

        pdf.setFontSize(20);

        pdf.text(
            "Lucid Dream Control Questionnaire",
            pageWidth / 2,
            y,
            {
                align: "center"
            }
        );

        y += 9;

        pdf.setFontSize(14.5);

        pdf.text(
            "Results Report",
            pageWidth / 2,
            y,
            {
                align: "center"
            }
        );

        y += 8;

        const reportDate =
            new Date().toLocaleString(
                undefined,
                {
                    dateStyle: "long",
                    timeStyle: "short"
                }
            );

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...colours.muted);

        pdf.setFontSize(9.5);

        pdf.text(
            `Generated: ${
                normalisePdfText(
                    reportDate
                )
            }`,
            pageWidth / 2,
            y,
            {
                align: "center"
            }
        );

        y = 61;


        /* -------------------------------------------------
           Domain score summary
           ------------------------------------------------- */

        addSectionHeading(
            "Domain Score Summary"
        );

        const domainColumnX = margin + 3;
        const controlColumnX = pageWidth - margin - 42;
        const engagementColumnX = pageWidth - margin - 4;

        pdf.setFillColor(...colours.deep);
        pdf.roundedRect(
            margin,
            y - 4.8,
            contentWidth,
            8,
            1,
            1,
            "F"
        );
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(...colours.white);
        pdf.text("DOMAIN", domainColumnX, y);
        pdf.text("CONTROL", controlColumnX, y, { align: "right" });
        pdf.text("ENGAGEMENT", engagementColumnX, y, { align: "right" });
        y += 9;

        questionnaireSections.forEach(
            (section) => {
                const domainTitle =
                    section.querySelector(
                        "h2"
                    )?.textContent ||
                    section.dataset.domain ||
                    "Domain";

                const controlScore =
                    getInputValue(
                        section,
                        ".control-score"
                    );

                const engagementScore =
                    getInputValue(
                        section,
                        ".engagement-score"
                    );

                ensureSpace(7);

                pdf.setFillColor(...(
                    questionnaireSections.indexOf(section) % 2 === 0
                        ? colours.paper
                        : colours.white
                ));
                pdf.roundedRect(
                    margin,
                    y - 4.6,
                    contentWidth,
                    7.2,
                    0.8,
                    0.8,
                    "F"
                );

                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...colours.ink);

                pdf.setFontSize(10);

                pdf.text(
                    normalisePdfText(
                        domainTitle
                    ),
                    margin,
                    y
                );

                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...colours.accent);

                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...colours.deep);
                pdf.text(controlScore, controlColumnX, y, { align: "right" });
                pdf.text(engagementScore, engagementColumnX, y, { align: "right" });

                y += 6;
            }
        );

        y += 3;


        /* -------------------------------------------------
           Spider plot only

           The chart is exported directly from its canvas
           or SVG. The table underneath it is not included.
           ------------------------------------------------- */

        const chartContainer =
            document.getElementById(
                "spider-chart"
            );

        const chartGraphic =
            chartContainer?.querySelector(
                "canvas, svg"
            );

        if (chartGraphic) {
            addSectionHeading(
                "Score Plot"
            );

            const chartImage =
                await getSpiderChartImage();

            let imageWidth =
                contentWidth;

            let imageHeight =
                imageWidth *
                (
                    chartImage.height /
                    chartImage.width
                );

            const maximumHeight = 125;

            if (
                imageHeight >
                maximumHeight
            ) {
                imageHeight =
                    maximumHeight;

                imageWidth =
                    imageHeight *
                    (
                        chartImage.width /
                        chartImage.height
                    );
            }

            ensureSpace(
                imageHeight + 5
            );

            const imageX =
                margin +
                (
                    contentWidth -
                    imageWidth
                ) / 2;

            pdf.addImage(
                chartImage.dataUrl,
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


        /* -------------------------------------------------
           Individual questionnaire domains
           ------------------------------------------------- */

        questionnaireSections.forEach(
            (section) => {
                addNewPage();

                const domainTitle =
                    section.querySelector(
                        "h2"
                    )?.textContent ||
                    section.dataset.domain ||
                    "Questionnaire Domain";

                addSectionHeading(
                    domainTitle
                );

                pdf.setFillColor(...colours.soft);
                const metricsTop = y - 3;
                const metricsInset = 7;
                const metricsLeft = margin + metricsInset;
                const metricsContentWidth =
                    contentWidth - metricsInset * 2;
                pdf.roundedRect(
                    metricsLeft,
                    metricsTop,
                    metricsContentWidth,
                    37,
                    1.5,
                    1.5,
                    "F"
                );

                const totalDomainScore =
                    getInputValue(
                        section,
                        ".total-domain-score"
                    );

                const questionsAnswered =
                    getInputValue(
                        section,
                        ".questions-answered"
                    );

                const nonNaCount =
                    getInputValue(
                        section,
                        ".non-na-count"
                    );

                const controlScore =
                    getInputValue(
                        section,
                        ".control-score"
                    );

                const engagementScore =
                    getInputValue(
                        section,
                        ".engagement-score"
                    );

                const metricWidth = metricsContentWidth / 3;
                const metricLabels = [
                    "TOTAL SCORE",
                    "ITEMS ANSWERED",
                    "ATTEMPTED ITEMS"
                ];
                const metricValues = [
                    totalDomainScore,
                    questionsAnswered,
                    nonNaCount
                ];

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(7.5);
                pdf.setTextColor(...colours.muted);

                metricLabels.forEach((label, metricIndex) => {
                    const metricX =
                        metricsLeft + 5 + metricWidth * metricIndex;

                    pdf.text(label, metricX, metricsTop + 7);
                    pdf.setFontSize(13);
                    pdf.setTextColor(...colours.deep);
                    pdf.text(
                        metricValues[metricIndex],
                        metricX,
                        metricsTop + 14
                    );
                    pdf.setFontSize(7.5);
                    pdf.setTextColor(...colours.muted);
                });

                pdf.setDrawColor(...colours.line);
                pdf.setLineWidth(0.2);
                pdf.line(
                    metricsLeft + 5,
                    metricsTop + 19,
                    metricsLeft + metricsContentWidth - 5,
                    metricsTop + 19
                );

                pdf.setFontSize(8);
                pdf.setTextColor(...colours.muted);
                pdf.text("CONTROL", metricsLeft + 5, metricsTop + 27);
                pdf.text(
                    "ENGAGEMENT",
                    metricsLeft + metricsContentWidth / 2 + 5,
                    metricsTop + 27
                );

                pdf.setFontSize(14);
                pdf.setTextColor(...colours.accent);
                pdf.text(controlScore, metricsLeft + 35, metricsTop + 27);
                pdf.text(
                    engagementScore,
                    metricsLeft + metricsContentWidth / 2 + 43,
                    metricsTop + 27
                );

                y = metricsTop + 45;

                pdf.setFontSize(7.5);
                pdf.setTextColor(...colours.muted);
                pdf.text("ITEM", margin, y);
                pdf.text(
                    "RESPONSE",
                    pageWidth - margin,
                    y,
                    { align: "right" }
                );
                y += 3;
                pdf.setDrawColor(...colours.line);
                pdf.line(margin, y, pageWidth - margin, y);
                y += 6;

                const questionRows =
                    Array.from(
                        section.querySelectorAll(
                            ".score-table tbody tr"
                        )
                    );

                questionRows.forEach(
                    (row, index) => {
                        const cells =
                            row.querySelectorAll(
                                "td"
                            );

                        const number =
                            normalisePdfText(
                                cells[0]?.textContent
                            ) ||
                            `${index + 1}.`;

                        const question =
                            normalisePdfText(
                                cells[1]?.textContent
                            ).replace(
                                /^(?:\.{3}|["'|])+\s*/,
                                ""
                            ).replace(
                                /^[^A-Za-z0-9]+/,
                                ""
                            );

                        const answerInput =
                            row.querySelector(
                                ".domain-score"
                            );

                        const answer =
                            normalisePdfText(
                                answerInput?.value
                            ) ||
                            "Not answered";

                        const questionLines =
                            pdf.splitTextToSize(
                                question,
                                contentWidth - 60
                            );

                        const rowHeight = Math.max(
                            11,
                            questionLines.length * 4.4 + 5
                        );

                        ensureSpace(rowHeight);

                        if (index % 2 === 0) {
                            pdf.setFillColor(...colours.paper);
                            pdf.rect(
                                margin,
                                y - 4,
                                contentWidth,
                                rowHeight,
                                "F"
                            );
                        }

                        pdf.setFont("helvetica", "normal");
                        pdf.setFontSize(9.5);
                        pdf.setTextColor(...colours.muted);
                        pdf.text(number, margin + 3, y);

                        pdf.setTextColor(...colours.ink);
                        questionLines.forEach((line, lineIndex) => {
                            pdf.text(
                                line,
                                margin + 13,
                                y + lineIndex * 4.4
                            );
                        });

                        pdf.setFillColor(...colours.soft);
                        pdf.roundedRect(
                            pageWidth - margin - 18,
                            y - 4.5,
                            18,
                            7.5,
                            1,
                            1,
                            "F"
                        );
                        pdf.setTextColor(...colours.deep);
                        pdf.text(
                            answer,
                            pageWidth - margin - 9,
                            y,
                            { align: "center" }
                        );

                        y += rowHeight;
                    }
                );
            }
        );


        /* -------------------------------------------------
           Page numbers
           ------------------------------------------------- */

        const pageCount =
            pdf.getNumberOfPages();

        for (
            let pageNumber = 1;
            pageNumber <= pageCount;
            pageNumber += 1
        ) {
            pdf.setPage(pageNumber);

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...colours.muted);

            pdf.setFontSize(8.5);

            pdf.text(
                `Page ${pageNumber} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 7,
                {
                    align: "center"
                }
            );

            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...colours.deep);
            pdf.text(
                "LDCQ - Dream Control Profile",
                margin,
                pageHeight - 7
            );

            pdf.setFontSize(7.2);
            pdf.setTextColor(...colours.muted);
            pdf.text(
                "Developed by Emma Peters, Daniel Erlacher & Clarita Bonamino",
                pageWidth - margin,
                pageHeight - 7,
                {
                    align: "right"
                }
            );
        }


        /* -------------------------------------------------
           Download the PDF
           ------------------------------------------------- */

        const now = new Date();

        const fileDate = [
            now.getFullYear(),
            String(
                now.getMonth() + 1
            ).padStart(2, "0"),
            String(
                now.getDate()
            ).padStart(2, "0")
        ].join("-");

        pdf.save(
            `LDCQ-report-${fileDate}.pdf`
        );
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
