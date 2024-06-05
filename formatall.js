const {google} = require("googleapis")
const fs = require("fs")
const readline = require("readline")
const {JSDOM} = require("jsdom")

// Create an OAuth2 client to authorize the API call
const auth = new google.auth.GoogleAuth({
	keyFile: "batch-articles-ds-c7b314d038cf.json",
	scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

const sheets = google.sheets({version: "v4", auth})

// Function to prompt user for input
async function getUserInput(prompt) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	return new Promise((resolve) => {
		rl.question(prompt, (answer) => {
			rl.close()
			resolve(answer)
		})
	})
}

// Function to get data from Google Sheets
async function getSheetData(spreadsheetId, sheetName, column) {
	const response = await sheets.spreadsheets.values.get({
		spreadsheetId: spreadsheetId,
		range: `${sheetName}!${column}`,
	})
	return response.data.values || []
}

// Function to write data to Google Sheets
async function writeSheetData(spreadsheetId, sheetName, column, values) {
	await sheets.spreadsheets.values.update({
		spreadsheetId: spreadsheetId,
		range: `${sheetName}!${column}`,
		valueInputOption: "RAW",
		resource: {
			values: values.map((value) => [value]),
		},
	})
}

// Main function
async function main() {
	let spreadsheetId = (await getUserInput("Enter the Google Sheets document ID: ")) || "1O3P4OoFLrAfSOnP6oRzjzlQzYzsiJoiRxDjzHMCaljk"
	spreadsheetId = spreadsheetId.replace(/.*\/d\/(.*)\/.*/, "$1")
	const sheetName = (await getUserInput("Enter the sheet name (default: Темы): ")) || "Темы"
	const inputColumn = (await getUserInput("Enter the column to take data from (default: H:H): ")) || "H:H"
	const outputColumn = (await getUserInput("Enter the column to output data to (default: I:I): ")) || "I:I"

	const data = await getSheetData(spreadsheetId, sheetName, inputColumn)

	const formattedData = data.map(([cell]) => ({
		original: cell,
		formatted: formatOriginal(cell),
	}))

	fs.writeFileSync("buffer.json", JSON.stringify(formattedData, null, 2))

	const formattedValues = formattedData.map(({formatted}) => formatted)

	await writeSheetData(spreadsheetId, sheetName, outputColumn, formattedValues)

	console.log("Data processed and written to Google Sheets successfully.")
}

main().catch(console.error)

// Your provided formatOriginal function and other helper functions go here
function removeLonelyH3(cleared) {
	const index = cleared.indexOf("<h2>Итог</h2>")
	let partBeforeItog = cleared.slice(0, index)
	const {document} = new JSDOM(partBeforeItog).window
	const doc = document

	Array.from(doc.querySelectorAll("h2")).forEach((h2, index, h2s) => {
		let nextH2 = h2s[index + 1]
		let elementsBetween = []
		for (let sibling = h2.nextElementSibling; sibling && sibling !== nextH2; sibling = sibling.nextElementSibling) {
			elementsBetween.push(sibling)
		}

		let h3s = elementsBetween.filter((el) => el.tagName.toLowerCase() === "h3")
		if (h3s.length === 1 && (elementsBetween[0] === h3s[0] || elementsBetween[elementsBetween.length - 1] === h3s[0])) {
			partBeforeItog = partBeforeItog.replace(h3s[0].outerHTML, "")
		}
	})

	return partBeforeItog + cleared.slice(index)
}

function modifyHeadings(cleared) {
	if (!/<h1.*?>/i.test(cleared)) return cleared

	let partBeforeItog = cleared.split("<h2>Итог</h2>")[0]
	const {document} = new JSDOM(partBeforeItog).window
	const doc = document
	const h1s = Array.from(doc.querySelectorAll("h1"))

	if (h1s.length <= 2) return cleared

	let allH2sBetween = []
	h1s.forEach((h1) => {
		let h2sBetween = []
		for (let sibling = h1.nextElementSibling; sibling && sibling.tagName.toLowerCase() !== "h1"; sibling = sibling.nextElementSibling) {
			if (sibling.tagName.toLowerCase() === "h2") h2sBetween.push(sibling)
		}
		allH2sBetween = allH2sBetween.concat(h2sBetween)
	})

	if (allH2sBetween.filter((el) => el.tagName === "H2").length < 4) return cleared

	partBeforeItog = partBeforeItog.replace(/<h2>/g, "<h3>").replace(/<\/h2>/g, "</h3>")
	partBeforeItog = partBeforeItog.replace(/<h1>/g, "<h2>").replace(/<\/h1>/g, "</h2>")

	let partAfterItog = cleared.split("<h2>Итог</h2>")[1]
	console.log("modified headings 👌")
	return partBeforeItog + "<h2>Итог</h2>" + (partAfterItog || "")
}

function automatic2FAQ(cleared) {
	const regex = /<h2>Часто\s*Задаваемые\s*Вопросы<\/h2>/i
	const match = cleared.match(regex)
	if (!match) return cleared

	const index = match.index
	const afterFAQs = cleared.slice(index + match[0].length)
	if ((afterFAQs.match(/<h2>/g) || []).length === 5) {
		const newFAQs = afterFAQs.replace(/<h2>/g, "<h3>").replace(/<\/h2>/g, "</h3>")
		return cleared.slice(0, index) + match[0] + newFAQs
	}

	return cleared
}

function formatOriginal(original) {
	const tags2trim = ["html", "body", "header", "head", "article", "aside", "section", "footer"]
	const tags2delete = ["title", "style"]
	let cleared = original

	cleared = cleared
		.replace(/""/g, '"')
		.replace(/""/g, '"')
		.replace(/^\"|\"$/g, "")
	cleared = cleared.replace(/```html/g, "").replace(/```/g, "")

	cleared = cleared.replace(/^(Below|Certainly|Given the|It's important|However).*/i, "")
	cleared = cleared.slice(0, cleared.lastIndexOf(">") + 1)

	// delete everything inside of tags2delete
	tags2delete.forEach((tag) => {
		cleared = cleared.replace(new RegExp(`<.*${tag}.*>[^<]*<\/${tag}>`, "gi"), "")
	})
	// trim only tags themself of tags2trim
	tags2trim.forEach((tag) => {
		cleared = cleared.replace(new RegExp(`<.*${tag}.*>|<\/${tag}>`, "gi"), "")
	})
	// trim meta tag
	cleared = cleared.replace(/<meta.*>/g, "")

	cleared = cleared.replace(/^\s+|\s+$/g, "")
	cleared = cleared.replace(/^\s*<h[1-5]>.*<\/h[1-5]>\s*/g, "")
	// вопрос
	cleared = cleared.replace(/<h2>Введение<\/h2>/g, "")
	cleared = cleared.replace(/<dt>Q([1-5]*)/g, "<dt>Вопрос $1")
	cleared = cleared.replace(/<dt>Q([1-5]*)/g, "<dt>Вопрос $1")
	cleared = cleared.replace(/(<p>\s*<strong>Q[1-5]*):/g, "<p><strong>")
	cleared = cleared.replace(/(<h3>([ВQ]|FAQ)\s*[1-5]:\s*)/g, "<h3>")
	cleared = cleared.replace(/(<strong>В[1-5]*:\s*)/g, "<strong>")
	// ответ
	cleared = cleared.replace(/(<p>[ОA][1-5]*:\s*)/g, "<p>")
	cleared = cleared.replace(/<b>[ОA]([1-5]*):\s*/g, "<b>Ответ $1:")
	cleared = cleared.replace(/<dd>\s*[AА]([1-5]*)/g, "<dd>Ответ $1")
	cleared = cleared.replace(/<p>\s*<strong>[ОA]([1-5]*):*<\/strong>/g, "<p>Ответ $1:")
	cleared = cleared.replace(/(\sО: )/g, "")

	// Вопросы и Ответы
	cleared = cleared.replace(
		/<h[1-5]>\s*(Заключительные вопросы и ответы|Frequently Asked Questions|Вопросы и Ответы|Часто задаваемые вопросы с ответами|ЧаВО)\s*<\/h[1-5]>/gi,
		"<h2>Часто задаваемые вопросы</h2>"
	)
	cleared = cleared.replace(/<(h[1-5]|p|strong)>[^<>]*FAQ[^<>]*<\/(h[1-5]|p|strong)>/gi, "<h2>Часто задаваемые вопросы</h2>")

	// Trim duplicate of <h3>Часто задаваемые вопросы</h3>
	cleared = cleared.replace(/<h[3-5]>Часто задаваемые вопросы<\/h[3-5]>/i, "<h2>Часто задаваемые вопросы</h2>")
	// trim duplicate of <h2>Часто задаваемые вопросы</h2>
	if (cleared.match(/<h2>Часто задаваемые вопросы<\/h2>/gi) && cleared.match(/<h2>Часто задаваемые вопросы<\/h2>/gi).length > 1) {
		cleared = cleared.replace(/<h2>Часто задаваемые вопросы<\/h2>/i, "")
	}
	if (cleared.match(/<h2>Часто задаваемые вопросы<\/h2>/gi) && cleared.match(/<h2>Часто задаваемые вопросы<\/h2>/gi).length > 1) {
		cleared = cleared.replace(/<h2>Часто задаваемые вопросы<\/h2>/i, "")
	}

	// Заключение
	cleared = cleared.replace(/<h.*[1-5].*>(Заключение|Conclusion|Конклюзия|Выводы|Вывод)<\/h[1-5]>/g, "<h2>Итог</h2>")
	cleared = cleared.replace(/<table.*>/g, '<table border="1">')

	cleared = cleared.replace(/^\s+|\s+$/g, "")

	// Check for the first <h3> tag and change to <h2> if no <h2> before it
	const firstH3Index = cleared.indexOf("<h3>")
	const firstH2Index = cleared.indexOf("<h2>")
	if (firstH3Index !== -1 && (firstH2Index === -1 || firstH3Index < firstH2Index)) {
		cleared = cleared.replace("<h3>", "<h2>").replace("</h3>", "</h2>")
	}

	cleared = removeLonelyH3(cleared)
	cleared = modifyHeadings(cleared) // automatic 2h2
	cleared = removeLonelyH3(cleared)
	cleared = automatic2FAQ(cleared) // automatic 2FAQ

	cleared = cleared.replace(/<p>([^<]*)(<(ol|ul)>.*?<\/\3>)([^<]*)<\/p>/gs, "<p>$1</p>$2<p>$4</p>")
	cleared = cleared.replace(/<h2>([^<]*)<\/h3>/g, "<h2>$1</h2>")
	cleared = cleared.replace(/<p>([^<]*)<\/h[1-5]>/g, "<p>$1</p>")
	cleared = cleared.replace(/<\w*>\s*<\/\w*>/g, "")
	cleared = cleared.replace(/<p>\s*(<h3>[^<]*<\/h3>)\s*<\/p>/g, "$1")

	return cleared
}
