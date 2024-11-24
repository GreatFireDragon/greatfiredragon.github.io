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

function formatText1() {
	const input = document.getElementById("inputText1").value
	const formattedText = input
		.split("\n")
		.map((line) => line.replace(/:\s*\d+$/, "").trim())
		.filter((line) => line)
		.join("\n")
	document.getElementById("outputText1").value = formattedText
}

function formatText3() {
	const input = document.getElementById("inputText3").value
	const formatted = input
		.split("\n")
		.map((line) => line.replace(/<H1>/g, "H1 -").replace(/<H2>/g, "H2 -").trim())
		.filter((line) => line)
		.join("\n")
	document.getElementById("outputText3").value = formatted
}

function copyToClipboard(id) {
	const output = document.getElementById(id)
	output.select()
	document.execCommand("copy")
}

function animateTextarea(id) {
	const textarea = document.getElementById(id)
	textarea.classList.add("textarea-animate")
	setTimeout(() => {
		textarea.classList.remove("textarea-animate")
	}, 1000)
}

// SECOND FORMATTER

function formatText2() {
	try {
		// Check if snowballFactory is defined
		if (typeof snowballFactory === "undefined") {
			throw new Error("snowballFactory is not defined. Ensure snowball.min.js is loaded correctly.")
		}

		// Initialize the Snowball stemmer for Russian
		var stemmer = snowballFactory.newStemmer("Russian")
		console.log("Snowball stemmer initialized for Russian.")

		// Get input text
		const input = document.getElementById("inputText2").value
		const lines = input.split("\n")
		const counts = {}

		// Function to normalize phrases using the stemmer
		function normalizePhrase(phrase) {
			const words = phrase.split(" ")
			const stemmedWords = words.map((word) => {
				return stemmer.stem(word.toLowerCase())
			})
			return stemmedWords.join(" ")
		}

		// Process each line
		lines.forEach((line) => {
			let trimmed = line.trim()
			if (trimmed && trimmed !== "Ключи из тематики") {
				const parenIndex = trimmed.indexOf(" (")
				if (parenIndex !== -1) {
					trimmed = trimmed.substring(0, parenIndex)
				}
				const parts = trimmed.split(" - ")
				if (parts.length === 2) {
					const keyword = parts[0].trim().toLowerCase()
					const count = parseInt(parts[1].replace("раз", "").trim())
					if (!isNaN(count)) {
						const normalizedKeyword = normalizePhrase(keyword)
						let found = false
						for (const existing in counts) {
							if (normalizePhrase(existing) === normalizedKeyword) {
								counts[existing] += count
								found = true
								break
							}
						}
						if (!found) {
							counts[keyword] = count
						}
					}
				}
			}
		})

		// Function to get correct form of "раз"
		const getCorrectForm = (num) => {
			if (num % 10 === 1 && num % 100 !== 11) return "раз"
			if ([2, 3, 4].includes(num % 10) && ![12, 13, 14].includes(num % 100)) return "раза"
			return "раз"
		}

		// Format the output
		const formatted = Object.entries(counts)
			.map(([kw, cnt]) => `${kw} - ${cnt} ${getCorrectForm(cnt)}`)
			.join("\n")

		// Set the output textarea
		document.getElementById("outputText2").value = formatted
		console.log("formatText2 executed successfully.")
	} catch (error) {
		console.error("Error in formatText2:", error)
	}
}
