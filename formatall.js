const {JSDOM} = require("jsdom")

//  Removes lonely h3 elements that are not surrounded by other content.
//  https://paste.pics/d814be07628bd08b0df3e8f7c3b535be
function removeLonelyH3(cleared) {
	const index = cleared.indexOf("<h2>Часто задаваемые вопросы</h2>")
	if (index === -1) index = cleared.indexOf("<h2>Итог</h2>")
	if (index === -1) return cleared

	let partBeforeItog = cleared.slice(0, index)
	const {document} = new JSDOM(partBeforeItog).window
	const doc = document

	// Iterate over each h2 element before the "Итог" section
	Array.from(doc.querySelectorAll("h2")).forEach((h2, index, h2s) => {
		let nextH2 = h2s[index + 1]

		// Get the elements between the current h2 and the next one
		let elementsBetween = []
		for (let sibling = h2.nextElementSibling; sibling && sibling !== nextH2; sibling = sibling.nextElementSibling) {
			elementsBetween.push(sibling)
		}

		// Check if the only h3 element between the current h2 and the next one
		// is either the first or the last element in the array
		let h3s = elementsBetween.filter((el) => el.tagName.toLowerCase() === "h3")
		if (h3s.length === 1 && (elementsBetween[0] === h3s[0] || elementsBetween[elementsBetween.length - 1] === h3s[0])) {
			// Remove the h3 element from the string
			partBeforeItog = partBeforeItog.replace(h3s[0].outerHTML, "")
		}
	})

	// console.log(partBeforeItog)

	return partBeforeItog + cleared.slice(index)
}

/**
 * Basically: Если в тексте нормальная структура, но на один уровень заголовковы выше,
 * тогда H2 → H3, H1 → H2
 */
function modifyHeadings(cleared) {
	// If the text does not contain an h1 heading, return the text as is.
	if (!/<h1.*?>/i.test(cleared)) return cleared

	// Get the part of the text before the "Итог" section.
	let partBeforeItog = cleared.split("<h2>Итог</h2>")[0]
	const {document} = new JSDOM(partBeforeItog).window
	const doc = document
	// Get all h1 headings in the text.
	const h1s = Array.from(doc.querySelectorAll("h1"))

	// If there are two or fewer h1 headings, return the text as is.
	if (h1s.length <= 2) return cleared

	// Get all h2 headings between the h1 headings.
	let allH2sBetween = []
	h1s.forEach((h1) => {
		let h2sBetween = []
		for (let sibling = h1.nextElementSibling; sibling && sibling.tagName.toLowerCase() !== "h1"; sibling = sibling.nextElementSibling) {
			if (sibling.tagName.toLowerCase() === "h2") h2sBetween.push(sibling)
		}
		allH2sBetween = allH2sBetween.concat(h2sBetween)
	})

	// If there are fewer than four h2 headings between the h1 headings, return the text as is.
	if (allH2sBetween.filter((el) => el.tagName === "H2").length < 4) return cleared

	// Convert all h2 headings between the h1 headings to h3 headings.
	partBeforeItog = partBeforeItog.replace(/<h2>/g, "<h3>").replace(/<\/h2>/g, "</h3>")
	// Convert all h1 headings to h2 headings.
	partBeforeItog = partBeforeItog.replace(/<h1>/g, "<h2>").replace(/<\/h1>/g, "</h2>")

	// Get the part of the text after the "Итог" section.
	let partAfterItog = cleared.split("<h2>Итог</h2>")[1]
	// console.log("modified headings 👌")
	// Return the modified text.
	return partBeforeItog + "<h2>Итог</h2>" + (partAfterItog || "")
}

/**
 * Basically: Если вопросоы у FAQ в виде h, H2 → H3
 */
function automatic2FAQ(cleared) {
	const regex = /<h2>Часто\s*Задаваемые\s*Вопросы<\/h2>/i
	const match = cleared.match(regex)
	if (!match) return cleared

	// Get the index of the start of the "Часто Задаваемые Вопросы" section.
	const index = match.index
	const afterFAQs = cleared.slice(index + match[0].length)

	// Check if the section contains exactly 5 sub-headings.
	if ((afterFAQs.match(/<h2>/g) || []).length === 5) {
		// Convert the sub-headings to use h3 headings.
		const newFAQs = afterFAQs.replace(/<h2>/g, "<h3>").replace(/<\/h2>/g, "</h3>")
		return cleared.slice(0, index) + match[0] + newFAQs
	}
	return cleared
}

/**
 * Если у текста всего 1 заголовок H2, а остальные H3, тогда H3 → H2
 * https://paste.pics/0343843beed81965463d531b1b5679e1
 */
function onlyOneHeading(cleared) {
	const index = cleared.indexOf("<h2>Итог</h2>")
	let partBeforeItog = cleared.slice(0, index)

	const {document} = new JSDOM(partBeforeItog).window
	const doc = document

	// Get all the h2 headings in the part before the "Итог" section.
	const h2s = doc.querySelectorAll("h2")

	// If there is only one h2 heading, convert all h3 and h4 headings to h2 headings.
	if (h2s.length === 1) {
		partBeforeItog = partBeforeItog
			.replace(/<h3>/g, "<h2>")
			.replace(/<\/h3>/g, "</h2>")
			.replace(/<h4>/g, "<h3>")
			.replace(/<\/h4>/g, "</h3>")
	}

	// Return the modified text.
	return partBeforeItog + cleared.slice(index)
}

function formatOriginal(original) {
	// Удалить ненужные тэги
	const tags2trim = ["html", "body", "header", "head", "article", "aside", "section", "footer", "!DOCTYPE html", "meta", "title"]
	const tags2delete = ["title"]
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
		cleared = cleared.replace(new RegExp(`<\s*${tag}>[^\/]*<\/${tag}>`, "gi"), "")
		cleared = cleared.replace(new RegExp(`<\s*${tag}[^\/]*\/${tag}>`, "gi"), "")
	})
	// trim only tags themself of tags2trim
	tags2trim.forEach((tag) => {
		cleared = cleared.replace(new RegExp(`<${tag}[^>]*>|<\/${tag}>`, "gi"), "")
	})
	// trim meta tag

	cleared = cleared.replace(/^\s+|\s+$/g, "")
	// Текст должен начинаться с <p>, поэтому удаляю лишние "первые" заголовки
	cleared = cleared.replace(/^\s*<h[1-5]>.*<\/h[1-5]>\s*/g, "")
	// Красивые вопросы
	cleared = cleared.replace(/<h2>Введение<\/h2>/g, "")
	cleared = cleared.replace(/<dt>Q([1-5]*)/g, "<dt>Вопрос $1")
	cleared = cleared.replace(/<dt>Q([1-5]*)/g, "<dt>Вопрос $1")
	cleared = cleared.replace(/(<p>\s*<strong>Q[1-5]*):/g, "<p><strong>")
	cleared = cleared.replace(/(<h3>([ВQ]|FAQ)\s*[1-5]:\s*)/g, "<h3>")
	cleared = cleared.replace(/(<strong>В[1-5]*:\s*)/g, "<strong>")
	// Красивые ответы
	cleared = cleared.replace(/(<p>[ОA][1-5]*:\s*)/g, "<p>")
	cleared = cleared.replace(/<b>[ОA]([1-5]*):\s*/g, "<b>Ответ $1:")
	cleared = cleared.replace(/<dd>\s*[AА]([1-5]*)/g, "<dd>Ответ $1")
	cleared = cleared.replace(/<p>\s*<strong>[ОA]([1-5]*):*<\/strong>/g, "<p>Ответ $1:")
	cleared = cleared.replace(/(\sО: )/g, "")

	// Замена синонимов FAQ на <h2>Часто задаваемые вопросы</h2>
	cleared = cleared.replace(
		/<h[1-5]>\s*(Заключительные вопросы и ответы|Frequently Asked Questions|Вопросы и Ответы|Часто задаваемые вопросы с ответами|ЧаВО)[\s:]*<\/h[1-5]>/gi,
		"<h2>Часто задаваемые вопросы</h2>"
	)
	cleared = cleared.replace(/<(h[1-5]|p|strong)>[^<>]*FAQ[^<>]*<\/(h[1-5]|p|strong)>/gi, "<h2>Часто задаваемые вопросы</h2>")

	// <h3>Часто задаваемые вопросы</h3> → h2
	cleared = cleared.replace(/<h[3-5]>Часто задаваемые вопросы<\/h[3-5]>/i, "<h2>Часто задаваемые вопросы</h2>")
	// Удалить дубликаты <h2>Часто задаваемые вопросы</h2>
	if (cleared.match(/<h2>Часто задаваемые вопросы/gi) && cleared.match(/<h2>Часто задаваемые вопросы/gi).length > 1) {
		cleared = cleared.replace(/<h2>Часто задаваемые вопросы<\/h2>/i, "")
	}
	if (cleared.match(/<h2>Часто задаваемые вопросы<\/h2>/gi) && cleared.match(/<h2>Часто задаваемые вопросы<\/h2>/gi).length > 1) {
		cleared = cleared.replace(/<h2>Часто задаваемые вопросы<\/h2>/i, "")
	}

	//  Замена синонимов Conclusion на <h2>Итог</h2>
	cleared = cleared.replace(/<h.*[1-5].*>(Заключение|Conclusion|Конклюзия|Выводы|Вывод)<\/h[1-5]>/g, "<h2>Итог</h2>")

	// Удалить дубликаты <h2>Итог</h2>
	let allItog = cleared.match(/<h2>Итог<\/h2>/gi)
	if (allItog && allItog.length > 1) {
		let lastIndex = cleared.lastIndexOf("<h2>Итог</h2>")
		let clearedBefore = cleared.slice(0, lastIndex)
		let clearedAfter = cleared.slice(lastIndex + 14)

		let pTagMatch = clearedAfter.match(/<p>[^<]*<\/p>/i)
		if (pTagMatch && pTagMatch.index < 3) {
			clearedAfter = clearedAfter.slice(pTagMatch[0].length)
		}
		cleared = clearedBefore + clearedAfter
	}

	// Красивая таблица
	cleared = cleared.replace(/<table.*>/g, '<table border="1">')
	cleared = cleared.replace(/^\s+|\s+$/g, "")

	// Если в статье самый первый заголовок — <h3>, заменяем на <h2>
	const firstH3Index = cleared.indexOf("<h3>")
	const firstH2Index = cleared.indexOf("<h2>")
	if (firstH3Index !== -1 && (firstH2Index === -1 || firstH3Index < firstH2Index)) {
		cleared = cleared.replace("<h3>", "<h2>").replace("</h3>", "</h2>")
	}

	cleared = removeLonelyH3(cleared)
	cleared = modifyHeadings(cleared) // automatic 2h2
	cleared = removeLonelyH3(cleared)
	cleared = automatic2FAQ(cleared) // automatic 2FAQ
	cleared = onlyOneHeading(cleared)

	// удалить конструкции типа h2>...текст...</h3 и т.п.
	cleared = cleared.replace(/<h2>([^<]*)<\/h[1-5]>/g, "<h2>$1</h2>")
	cleared = cleared.replace(/<p>([^<]*)<\/h[1-5]>/g, "<p>$1</p>")

	// Удалить пустые тэги. Например <p> </p>
	cleared = cleared.replace(/<p>([^<]*)(<(ol|ul)>.*?<\/\3>)([^<]*)<\/p>/gs, "<p>$1</p>$2<p>$4</p>")
	cleared = cleared.replace(/<\w*>\s*<\/\w*>/g, "")
	cleared = cleared.replace(/<p>\s*(<h3>[^<]*<\/h3>)\s*<\/p>/g, "$1")

	return cleared
}

module.exports = {
	removeLonelyH3,
	modifyHeadings,
	automatic2FAQ,
	onlyOneHeading,
	formatOriginal,
}
