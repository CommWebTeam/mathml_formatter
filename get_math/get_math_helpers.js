// perform general formatting for user-selected options
function get_math() {
	let file_reader_content = new FileReader();
	let content_str = document.getElementById("html_file").files[0];
	file_reader_content.onload = function(event) {
		let html_str = event.target.result;
		let math_lines = ["Number of math tags: " + (html_str.match(/<math>/g) || []).length];
		let html_list = html_str.split("\n");
		// keep track of whether currently in a math chunk for line breaks (formatting)
		let in_chunk = false;
		for (let i = 6; i < (html_list.length - 1); i++) {
			if (html_list[i - 1].includes("<m") || html_list[i].includes("<m") || html_list[i + 1].includes("<m") ||
			  html_list[i - 1].includes("</m") || html_list[i].includes("</m") || html_list[i + 1].includes("</m")) {
				// if beginning of chunk, label the chunk and add newline
				if (!in_chunk) {
					in_chunk = true;
					math_lines.push("\n");
					math_lines.push("<p>Line " + i + ":</p>");
				}
				math_lines.push(html_list[i]);
			} else {
				in_chunk = false;
			}
		}
		download(math_lines.join('\n'), "math_chunks.html", "text/html");
	}
	file_reader_content.readAsText(content_str);
}
