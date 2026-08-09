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

        let y = 18;


        /* -------------------------------------------------
           PDF utility functions
           ------------------------------------------------- */

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

            pdf.setFont(
                "times",
                fontStyle
            );

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

            pdf.setFont(
                "times",
                "bold"
            );

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


        /* -------------------------------------------------
           Report title
           ------------------------------------------------- */

        pdf.setFont(
            "times",
            "bold"
        );

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

        const reportDate =
            new Date().toLocaleString(
                undefined,
                {
                    dateStyle: "long",
                    timeStyle: "short"
                }
            );

        pdf.setFont(
            "times",
            "normal"
        );

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

        y += 11;


        /* -------------------------------------------------
           Domain score summary
           ------------------------------------------------- */

        addSectionHeading(
            "Domain Score Summary"
        );

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

                pdf.setFont(
                    "times",
                    "bold"
                );

                pdf.setFontSize(10);

                pdf.text(
                    normalisePdfText(
                        domainTitle
                    ),
                    margin,
                    y
                );

                pdf.setFont(
                    "times",
                    "normal"
                );

                pdf.text(
                    `Control: ${controlScore}    ` +
                    `Engagement: ${engagementScore}`,
                    pageWidth - margin,
                    y,
                    {
                        align: "right"
                    }
                );

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

            const maximumHeight = 105;

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

                addWrappedText(
                    `Total domain score: ` +
                    `${totalDomainScore}`,
                    {
                        spaceAfter: 1
                    }
                );

                addWrappedText(
                    `Questions answered: ` +
                    `${questionsAnswered}`,
                    {
                        spaceAfter: 1
                    }
                );

                addWrappedText(
                    `Questions not marked N.A.: ` +
                    `${nonNaCount}`,
                    {
                        spaceAfter: 1
                    }
                );

                addWrappedText(
                    `Control score: ` +
                    `${controlScore}`,
                    {
                        fontStyle: "bold",
                        spaceAfter: 1
                    }
                );

                addWrappedText(
                    `Engagement score: ` +
                    `${engagementScore}`,
                    {
                        fontStyle: "bold",
                        spaceAfter: 6
                    }
                );

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

                        addWrappedText(
                            `${number} ${question}`,
                            {
                                fontStyle:
                                    "bold",
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

            pdf.setFont(
                "times",
                "normal"
            );

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