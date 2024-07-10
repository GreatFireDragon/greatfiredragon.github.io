from bs4 import BeautifulSoup, Tag
import re

# Removes lonely h3 elements that are not surrounded by other content.
# https://paste.pics/d814be07628bd08b0df3e8f7c3b535be
def remove_lonely_h3(cleared):
    index = cleared.find("<h2>Итог</h2>")
    if index == -1:
        index = cleared.find("<h2>Часто задаваемые вопросы</h2>")
    if index == -1:
        return cleared
        
    part_before_itog = cleared[:index]
    doc = BeautifulSoup(part_before_itog, "html.parser")

    # Iterate over each h2 element before the "Итог" section
    for h2 in doc.find_all("h2"):
        next_h2 = h2.find_next_sibling("h2")

        # Get the elements between the current h2 and the next one
        elements_between = []
        sibling = h2.find_next_sibling()
        while sibling and sibling != next_h2:
            elements_between.append(sibling)
            sibling = sibling.find_next_sibling()

        # Check if the only h3 element between the current h2 and the next one
        # is either the first or the last element in the array
        h3s = [el for el in elements_between if el.name == "h3"]
        if len(h3s) == 1 and (elements_between[0] == h3s[0] or elements_between[-1] == h3s[0]):
            # Remove the h3 element from the string
            h3s[0].extract()

    return str(doc) + cleared[index:]

# /**
#  * Basically: Если в тексте нормальная структура, но заголовки на один уровень выше,
#  * тогда H2 → H3, H1 → H2
#  */
def modify_headings(cleared):
    # If the text does not contain an h1 heading, return the text as is.
    if not "<h1" in cleared:
        return cleared

    # Get the part of the text before the "Итог" section.
    part_before_itog = cleared.split("<h2>Итог</h2>")[0]
    doc = BeautifulSoup(part_before_itog, "html.parser")

    # Get all h1 headings in the text.
    h1s = doc.find_all("h1")

    # If there are two or fewer h1 headings, return the text as is.
    if len(h1s) <= 2:
        return cleared

    # Get all h2 headings between the h1 headings.
    all_h2s_between = []
    for h1 in h1s:
        h2s_between = []
        sibling = h1.find_next_sibling()
        while sibling and sibling.name != "h1":
            if sibling.name == "h2":
                h2s_between.append(sibling)
            sibling = sibling.find_next_sibling()
        all_h2s_between.extend(h2s_between)

    # If there are fewer than four h2 headings between the h1 headings, return the text as is.
    if len([el for el in all_h2s_between if el.name == "h2"]) < 4:
        return cleared

    # Convert all h2 headings between the h1 headings to h3 headings.
    part_before_itog = part_before_itog.replace("<h2>", "<h3>").replace("</h2>", "</h3>")
    # Convert all h1 headings to h2 headings.
    part_before_itog = part_before_itog.replace("<h1>", "<h2>").replace("</h1>", "</h2>")

    # Get the part of the text after the "Итог" section.
    part_after_itog = cleared.split("<h2>Итог</h2>")[1]
    print("modified headings 👌")
    # Return the modified text.
    return part_before_itog + "<h2>Итог</h2>" + (part_after_itog or "")


# Basically: Если вопросы у FAQ в виде H2, H2 → H3
def automatic2FAQ(cleared):

    regex = re.compile(r"<h2>Часто\s*Задаваемые\s*Вопросы</h2>", re.IGNORECASE)
    match = regex.search(cleared)
    if not match:
        return cleared

    # Get the index of the start of the "Часто Задаваемые Вопросы" section.
    index = match.start()
    after_faqs = cleared[index + len(match.group(0)):]

    # Check if the section contains exactly 5 sub-headings.
    if after_faqs.count("<h2>") == 5:
        # Convert the sub-headings to use h3 headings.
        new_faqs = after_faqs.replace("<h2>", "<h3>").replace("</h2>", "</h3>")
        return cleared[:index] + match.group(0) + new_faqs
    return cleared


# Если у текста всего 1 заголовок H2, а остальные H3, тогда H3 → H2
# https://paste.pics/0343843beed81965463d531b1b5679e1
def only_one_heading(cleared):
    index = cleared.find("<h2>Итог</h2>")
    part_before_itog = cleared[:index]

    doc = BeautifulSoup(part_before_itog, "html.parser")

    # Get all the h2 headings in the part before the "Итог" section.
    h2s = doc.find_all("h2")

    # If there is only one h2 heading, convert all h3 and h4 headings to h2 headings.
    if len(h2s) == 1:
        part_before_itog = part_before_itog.replace("<h3>", "<h2>").replace("</h3>", "</h2>")
        part_before_itog = part_before_itog.replace("<h4>", "<h3>").replace("</h4>", "</h3>")

    # Return the modified text.
    return part_before_itog + cleared[index:]

def format_original(original):
    # Удалить ненужные тэги
    tags2trim = ["html", "body", "header", "head", "article", "aside", "section", "footer"]
    tags2delete = ["title"]
    cleared = original

    cleared = cleared.replace('""', '"').replace('""', '"').strip('"')
    cleared = cleared.replace("```html", "").replace("```", "")

    cleared = re.sub(r"^(Below|Certainly|Given the|It's important|However).*", "", cleared, flags=re.IGNORECASE)
    cleared = cleared[:cleared.rfind(">") + 1]

    # delete everything inside of tags2delete
    for tag in tags2delete:
        cleared = re.sub(f"<.*{tag}.*>.*</{tag}>", "", cleared, flags=re.IGNORECASE)
    # trim only tags themselves of tags2trim
    for tag in tags2trim:
        cleared = re.sub(f"<.*{tag}.*>|</{tag}>", "", cleared, flags=re.IGNORECASE)
    # trim meta tag
    cleared = re.sub(r"<meta.*>", "", cleared)

    cleared = cleared.strip()
    # Текст должен начинаться с <p>, поэтому удаляю лишние "первые" заголовки
    cleared = re.sub(r"^\s*<h[1-5]>.*</h[1-5]>\s*", "", cleared)
    # Красивые вопросы
    cleared = cleared.replace("<h2>Введение</h2>", "")
    cleared = re.sub(r"<dt>Q([1-5]*)", r"<dt>Вопрос \1", cleared)
    cleared = re.sub(r"<p>\s*<strong>Q[1-5]*:", "<p><strong>", cleared)
    cleared = re.sub(r"<h3>([ВQ]|FAQ)\s*[1-5]:\s*", "<h3>", cleared)
    cleared = re.sub(r"<strong>В[1-5]*:\s*", "<strong>", cleared)
    # Красивые ответы
    cleared = re.sub(r"<p>[ОA][1-5]*:\s*", "<p>", cleared)
    cleared = re.sub(r"<b>[ОA]([1-5]*):\s*", r"<b>Ответ \1:", cleared)
    cleared = re.sub(r"<dd>\s*[AА]([1-5]*)", r"<dd>Ответ \1", cleared)
    cleared = re.sub(r"<p>\s*<strong>[ОA]([1-5]*):*</strong>", r"<p>Ответ \1:", cleared)
    cleared = re.sub(r"\sО: ", "", cleared)

    # Замена синонимов FAQ на <h2>Часто задаваемые вопросы</h2>
    cleared = re.sub(
        r"<h[1-5]>\s*(Заключительные вопросы и ответы|Frequently Asked Questions|Вопросы и Ответы|Часто задаваемые вопросы с ответами|ЧаВО)[\s:]*</h[1-5]>",
        "<h2>Часто задаваемые вопросы</h2>",
        cleared,
        flags=re.IGNORECASE
    )
    cleared = re.sub(r"<(h[1-5]|p|strong)>[^<>]*FAQ[^<>]*</\1>", "<h2>Часто задаваемые вопросы</h2>", cleared, flags=re.IGNORECASE)

    # <h3>Часто задаваемые вопросы</h3> → h2
    cleared = re.sub(r"<h[3-5]>Часто задаваемые вопросы</h[3-5]>", "<h2>Часто задаваемые вопросы</h2>", cleared, flags=re.IGNORECASE)
    # Удалить дубликаты <h2>Часто задаваемые вопросы</h2>
    if len(re.findall(r"<h2>Часто задаваемые вопросы</h2>", cleared, flags=re.IGNORECASE)) > 1:
        cleared = re.sub(r"<h2>Часто задаваемые вопросы</h2>", "", cleared, count=1, flags=re.IGNORECASE)
    if len(re.findall(r"<h2>Часто задаваемые вопросы</h2>", cleared, flags=re.IGNORECASE)) > 1:
        cleared = re.sub(r"<h2>Часто задаваемые вопросы</h2>", "", cleared, count=1, flags=re.IGNORECASE)

    #  Замена синонимов Conclusion на <h2>Итог</h2>
    cleared = re.sub(r"<h.*[1-5].*>(Заключение|Conclusion|Конклюзия|Выводы|Вывод)</h[1-5]>", "<h2>Итог</h2>", cleared, flags=re.IGNORECASE)

    # Удалить дубликаты <h2>Итог</h2>
    all_itog = re.findall(r"<h2>Итог</h2>", cleared, flags=re.IGNORECASE)
    if all_itog and len(all_itog) > 1:
        last_index = cleared.rfind("<h2>Итог</h2>")
        cleared_before = cleared[:last_index]
        cleared_after = cleared[last_index + 14:]

        p_tag_match = re.search(r"<p>[^<]*</p>", cleared_after, re.IGNORECASE)
        if p_tag_match and p_tag_match.start() < 3:
            cleared_after = cleared_after[p_tag_match.end():]
        cleared = cleared_before + cleared_after

    # Красивая таблица
    cleared = re.sub(r"<table.*>", '<table border="1">', cleared)
    cleared = cleared.strip()

    # Если в статье самый первый заголовок — <h3>, заменяем на <h2>
    first_h3_index = cleared.find("<h3>")
    first_h2_index = cleared.find("<h2>")
    if first_h3_index != -1 and (first_h2_index == -1 or first_h3_index < first_h2_index):
        cleared = cleared.replace("<h3>", "<h2>").replace("</h3>", "</h2>")

    cleared = remove_lonely_h3(cleared)
    cleared = modify_headings(cleared)  # automatic 2h2
    cleared = remove_lonely_h3(cleared)
    cleared = automatic2FAQ(cleared)  # automatic 2FAQ
    cleared = only_one_heading(cleared)

    # удалить конструкции типа h2>...текст...</h3 и т.п.
    cleared = re.sub(r"<h2>([^<]*)</h[1-5]>", r"<h2>\1</h2>", cleared)
    cleared = re.sub(r"<p>([^<]*)</h[1-5]>", r"<p>\1</p>", cleared)

    # Удалить пустые тэги. Например <p> </p>
    cleared = re.sub(r"<p>([^<]*)(<(ol|ul)>.*?</\3>)([^<]*)</p>", r"<p>\1</p>\2<p>\4</p>", cleared, flags=re.DOTALL)
    cleared = re.sub(r"<\w*>\s*</\w*>", "", cleared)
    cleared = re.sub(r"<p>\s*(<h3>[^<]*</h3>)\s*</p>", r"\1", cleared)

    return cleared
