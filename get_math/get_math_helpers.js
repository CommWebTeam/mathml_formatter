// perform general formatting for user-selected options
function get_math() {
	let file_reader_content = new FileReader();
	let content_str = document.getElementById("html_file").files[0];
	file_reader_content.onload = function(event) {
		let html_str = event.target.result;
		let math_lines = ["Number of math tags: " + match_with_empty(html_str, /<math/g).length];
		let html_list = html_str.split("\n");
		// keep track of whether currently in a math chunk for line breaks (formatting)
		let in_chunk = false;
		// loop through lines in html document
		for (let i = 6; i < (html_list.length - 1); i++) {
			// check if current line includes a math tag
			if (html_list[i - 1].includes("<m") || html_list[i].includes("<m") || html_list[i + 1].includes("<m") ||
			  html_list[i - 1].includes("</m") || html_list[i].includes("</m") || html_list[i + 1].includes("</m")) {
				// if beginning of a math chunk, label the chunk with line number
				if (!in_chunk) {
					in_chunk = true;
					math_lines.push("\n");
					math_lines.push("<p>Line " + i + ":</p>");
				}
				math_lines.push(html_list[i]);
			// end current chunk if there is no math
			} else {
				in_chunk = false;
			}
		}
		download(math_lines.join('\n'), "math_chunks.html", "text/html");
	}
	file_reader_content.readAsText(content_str);
}
