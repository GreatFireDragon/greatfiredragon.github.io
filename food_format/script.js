// run all the otehr function at the document load
document.addEventListener("DOMContentLoaded", () => {
	const formatters = [
		{inputId: "inputText1", outputId: "outputText1", formatFunc: formatText1},
		{inputId: "inputText2", outputId: "outputText2", formatFunc: formatText2},
		{inputId: "inputText3", outputId: "outputText3", formatFunc: formatText3},
	]

	formatters.forEach(({inputId, outputId, formatFunc}) => {
		const input = document.getElementById(inputId)
		input.addEventListener("paste", () => {
			setTimeout(() => {
				formatFunc()
				copyToClipboard(outputId)
				animateTextarea(outputId)
			}, 0)
		})
	})
})

// function description
/* 
жиры и углеводы: 2
глицерина и жирных: 1
жиров и углеводов: 1
↓
жиры и углеводы
глицерина и жирных
жиров и углеводов
 */
function formatText1() {
	const input = document.getElementById("inputText1").value
	const formattedText = input
		.split("\n")
		.map((line) => line.replace(/:\s*\d+$/, "").trim())
		.filter((line) => line)
		.join("\n")
	document.getElementById("outputText1").value = formattedText
	animateTextarea("outputText1")
}
/*
<H1> Хочется хлеба: причины постоянной тяги и нормы употребления хлебобулочных изделий
<H2> Какие полезные для организма вещества содержатся в хлебе
<H2> Польза хлебобулочных изделий для здоровья человека
↓
H1 - Хочется хлеба: причины постоянной тяги и нормы употребления хлебобулочных изделий
H2 - Какие полезные для организма вещества содержатся в хлебе
H2 - Польза хлебобулочных изделий для здоровья человека
*/
function formatText3() {
	const input = document.getElementById("inputText3").value
	const formatted = input
		.split("\n")
		.map((line) => {
			return line
				.replace(/<H1>/g, "H1 -")
				.replace(/<H[2-9]>/g, "H2 -")
				.trim()
		})
		.filter((line) => line)
		.join("\n")
	document.getElementById("outputText3").value = formatted
	animateTextarea("outputText3")
}

function copyToClipboard(id) {
	const output = document.getElementById(id)
	output.select()
	document.execCommand("copy")
}

var AnimationDuration = 1 // seconds
function animateTextarea(id) {
	const textarea = document.getElementById(id)
	textarea.classList.add("textarea-animate")
	setTimeout(() => {
		textarea.classList.remove("textarea-animate")
	}, AnimationDuration * 1000)
}

/*
кислот - 2 раза (в точной форме, как есть)
энергии - 6 раз (в точной форме, как есть)
Убрать из текста
кислот - 1 раз (...)
↓
кислот - 1 раз
энергии - 6 раз
*/
function formatText2() {
	try {
		// Check if snowballFactory is defined
		if (typeof snowballFactory === "undefined") {
			throw new Error("snowballFactory is not defined. Ensure snowball.min.js is loaded correctly.")
		}

		// Initialize the Snowball stemmer for Russian
		const stemmer = snowballFactory.newStemmer("Russian")
		console.log("Snowball stemmer initialized for Russian.")

		// Get input text
		const input = document.getElementById("inputText2").value
		const lines = input.split("\n")

		// Split input into sections based on the separator phrase "Уберите из текста"
		const separatorLine = "Уберите из текста"
		const separatorIndex = lines.findIndex((line) => line.trim() === separatorLine)

		let beforeLines = []
		let afterLines = []

		if (separatorIndex !== -1) {
			beforeLines = lines.slice(0, separatorIndex)
			afterLines = lines.slice(separatorIndex + 1)
		} else {
			// If separator not found, process all lines as beforeLines
			beforeLines = lines
			afterLines = []
		}

		// Process before and after sections
		const beforeCounts = processLines(beforeLines, stemmer)
		const afterCounts = processLines(afterLines, stemmer)

		// Adjust counts based on overlapping keys
		const {adjustedBeforeCounts, adjustedAfterCounts} = adjustCounts(beforeCounts, afterCounts)

		// Format the output
		const formatted = formatOutput(adjustedBeforeCounts, adjustedAfterCounts, getCorrectForm)

		// Set the output textarea
		document.getElementById("outputText2").value = formatted
		console.log("formatText2 executed successfully.")
	} catch (error) {
		console.error("Error in formatText2:", error)
	}

	// Helper function to process a list of lines into counts
	function processLines(lines, stemmer) {
		const counts = {}

		lines.forEach((line) => {
			let trimmed = line.trim()
			if (trimmed && trimmed !== "Ключи из тематики") {
				const parenIndex = trimmed.indexOf(" (")
				if (parenIndex !== -1) {
					trimmed = trimmed.substring(0, parenIndex)
				}
				const parts = trimmed.split(" - ")
				if (parts.length === 2) {
					const keyword = parts[0].trim()
					const count = parseInt(parts[1].replace(/раза?|разов?/, "").trim())
					if (!isNaN(count)) {
						const normalizedKeyword = normalizePhrase(keyword, stemmer)
						// If the normalized key already exists, sum the counts
						if (counts[normalizedKeyword]) {
							counts[normalizedKeyword].count += count
						} else {
							counts[normalizedKeyword] = {
								originalKey: keyword,
								count: count,
							}
						}
					}
				}
			}
		})

		return counts
	}

	// Helper function to normalize a phrase using the stemmer
	function normalizePhrase(phrase, stemmer) {
		const words = phrase.split(" ")
		const stemmedWords = words.map((word) => stemmer.stem(word.toLowerCase()))
		return stemmedWords.join(" ")
	}

	// Helper function to adjust counts based on overlapping keys
	function adjustCounts(beforeCounts, afterCounts) {
		const adjustedBeforeCounts = {}
		const adjustedAfterCounts = {}

		// Process overlapping keys
		for (const [normKey, beforeEntry] of Object.entries(beforeCounts)) {
			if (afterCounts[normKey]) {
				const afterEntry = afterCounts[normKey]
				if (beforeEntry.count > afterEntry.count) {
					adjustedBeforeCounts[normKey] = {
						originalKey: beforeEntry.originalKey,
						count: beforeEntry.count - afterEntry.count,
					}
				} else if (afterEntry.count > beforeEntry.count) {
					adjustedAfterCounts[normKey] = {
						originalKey: afterEntry.originalKey,
						count: afterEntry.count - beforeEntry.count,
					}
				}
				// Remove the key from both counts as it's processed
				delete afterCounts[normKey]
			} else {
				// Key only in beforeCounts
				adjustedBeforeCounts[normKey] = beforeEntry
			}
		}

		// Any remaining keys in afterCounts are keys only in afterCounts
		for (const [normKey, afterEntry] of Object.entries(afterCounts)) {
			adjustedAfterCounts[normKey] = afterEntry
		}

		return {adjustedBeforeCounts, adjustedAfterCounts}
	}

	// Helper function to format the final output
	function formatOutput(beforeCounts, afterCounts, getCorrectForm) {
		const formattedBefore = formatCounts(beforeCounts, getCorrectForm)
		const formattedAfter = formatCounts(afterCounts, getCorrectForm)

		let formatted = ""
		if (formattedBefore) {
			formatted += formattedBefore
		}

		if (formattedBefore && formattedAfter) {
			formatted += "\n\n" // Two new lines as separator
		}

		if (formattedAfter) {
			formatted += formattedAfter
		}

		return formatted
	}

	// Helper function to format counts into the desired output
	function formatCounts(counts, getCorrectForm) {
		const entries = Object.values(counts)
		if (entries.length === 0) {
			return ""
		}
		return entries.map(({originalKey, count}) => `${originalKey} - ${count} ${getCorrectForm(count)}`).join("\n")
	}

	// Helper function to get the correct form of "раз"
	function getCorrectForm(num) {
		if (num % 10 === 1 && num % 100 !== 11) return "раз"
		if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100)) return "раза"
		return "раз"
	}
}
