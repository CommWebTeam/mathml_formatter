// general regex
const mi_open = '<m[ion]( *[a-z]+ *= *"[-# a-z]+")*>';
const mi_open_nattr = '<m[ion](?: *[a-z]+ *= *"[-# a-z]+")*>';
const mo_invis = '(<mo>&(?:(?:#x206[0-9])|(?:i[ct]));</mo>)*';
const mo_invis_nattr = '(?:<mo>&(?:(?:#x206[0-9])|(?:i[ct]));</mo>)*';
const mi_close = '</m[ion]>';
const space = '[\s \t\r\n]*';

// apply various functions to clean up mathml code from word paste
function format_mathml() {
	// read in uploaded file as string
	let file_reader = new FileReader();
	let html_file = document.getElementById("html_file").files[0];
	file_reader.onload = function(event) {
		let word_mathml = event.target.result.replaceAll("\r\n", "\n");
		// fix word-generated mathml tags
		let cleaned_mathml = word_mathml.replaceAll("mml:", "").replaceAll(' xmlns:mml="http://www.w3.org/1998/Math/MathML" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"', "").replaceAll(" ", " ").replaceAll("&#xA0", " ");
		// remove mathvariant if needed
		if (document.getElementById("rm_mathvariant").checked) {
			cleaned_mathml = cleaned_mathml.replaceAll(' mathvariant="normal"', "");
		}
		// fix summations if formatting is valid
		if (document.getElementById("correct_indent").checked) {
			cleaned_mathml = format_summations(cleaned_mathml);
		}
		// remove extra spaces
		cleaned_mathml = replace_invisible_nbsp(cleaned_mathml);
		cleaned_mathml = rm_multispace(cleaned_mathml);
		// remove existing mspace and &af; so they can be readded later without duplicating
		cleaned_mathml = cleaned_mathml.replaceAll(/ *<mspace *\/ *>/g, "<mi> </mi>");
		cleaned_mathml = cleaned_mathml.replaceAll("<mo>&af;</mo>", "")
		// get array of multicharacter words
		let multichar_arr = document.getElementById("multichar").value.split("\n");
		// fix multicharacter words
		let cleaned_mathml_multichar = join_multichar_mi(cleaned_mathml, multichar_arr);
		// add mspace back in
		let replace_mspace_regex = new RegExp(mi_open + ' *' + mi_close, "g");
		let cleaned_mathml_multichar_mspace = cleaned_mathml_multichar.replaceAll(replace_mspace_regex, "<mspace />");
		download(cleaned_mathml_multichar_mspace, "mathml.html", "text/html");
	}
	file_reader.readAsText(html_file);
}

/* helper functions */

// add padding around mrow which has input regex, including indentation as its first group and remaining content as second
function add_mrow_padding(mathml_html, input_regex) {
	let padded_html = mathml_html;
	// each value in matches is an array where index 0 is the full match, index 1 is the munder(over) before the summation, index 2 is the indentation before the summation, index 3 is the full summation, index 4 is the values inside the summation
	let matches = [...padded_html.matchAll(input_regex)];
	for (let i = 0; i < matches.length; i++) {
		// get closing mrow of text (based on having same indentation as input line)
		let mrow_close = matches[i][2] + "</mrow>";
		// fix the first row of the summation, which should be the summation's bottom value if there is just one row
		let bot_regex = new RegExp(matches[i][0] + space + "<mrow>((.|\n)*?)\n" + mrow_close, "g");
		// add padding around contents of the mrow - remove spacing after newlines (i.e. proper indentation) so it won't be matched again later
		padded_html = padded_html.replace(bot_regex, matches[i][1] + "\n" + matches[i][3] + '<mrow><mpadded lspace="-0.7em" voffset="-1ex">$1</mpadded></mrow>');
		// fix the second row of the summation, which, if it exists, means there are both top and bottom values
		let bot_top_regex = new RegExp('</mpadded></mrow>' + space + "<mrow>((.|\n)*?)\n" + mrow_close, "g");
		// add padding around contents of the mrow - remove spacing after newlines (i.e. proper indentation) so it won't be matched again later
		padded_html = padded_html.replace(bot_top_regex, "\n " + '</mpadded> </mrow><mrow><mpadded lspace="-0.7em" voffset="1ex">$1</mpadded> </mrow>');
	}
	return padded_html;
}

// format summations, putting their text above and below
function format_summations(mathml_text) {
	// remove padding for now
	let edited_html = mathml_text.replaceAll(/<mpadded lspace="-0.7em" voffset="(?:.*?)ex">((.|\n)*?)<\/mpadded>/g, "$1");
	edited_html = edited_html.replaceAll(/<mpadded height="\+2ex" voffset="1ex">((.|\n)*?)<\/mpadded>/g, "$1")
	// pad each top + bottom text summation
	edited_html = add_mrow_padding(edited_html, /(<munder(?:over)*>) *\n( *)(<mo stretchy="false">(.*?)<\/mo>)/g);
	// pad spacing around summation
	edited_html = edited_html.replaceAll(/(<munder(over)*>(.|\n)*?<\/munder(over)*>)/g, '<mpadded height="+2ex" voffset="1ex">$1</mpadded>');
	return edited_html;
}

// assign type priorities so that joining variables (a/v/f) is done after adding separators (m/c), since joining variables takes priority
function type_prio(x) {
	if ((x.type === "m") || (x.type === "c")) {
		return 0;
	}
	if ((x.type === "a") || (x.type === "v") || (x.type === "f")) {
		return 1;
	}
}

// sort to deal with longer words first, so that shorter words being joined earlier doesn't prevent longer words from being recognized later
function sort_words(a, b) {
	// if two words are treated the same, sort by length in reverse
	if (type_prio(a) === type_prio(b)) {
		return a.val.length - b.val.length;
	}
	return type_prio(b) - type_prio(a);
}

// join consecutive mi/mo/mn for words in list
function join_multichar_mi(mathml_text, multichar_list) {
	let multichar_mathml_text = mathml_text;
	/*
	============================
	Create list of words to be joined
	============================
	*/
	// get list of objects containing word value and type of word
	let word_arr = [];
	for (i = 0; i < multichar_list.length; i++) {
		let multichar_word = multichar_list[i].trim();
		if (multichar_word.length > 2) {
			let multichar_val = multichar_word.substring(0, multichar_word.length - 2).trim();
			let multichar_type = multichar_word.substring(multichar_word.length - 1, multichar_word.length);
			word_arr.push({val: multichar_val, type: multichar_type});
		}
	}
	// sort list of words
	word_arr.sort(sort_words).reverse();
	// loop through each word
	for (i = 0; i < word_arr.length; i++) {
		let curr_word = word_arr[i];
		/*
		============================
		Split each word into a character array to search for each character in an <m[ion]> tag
		Make html entities count as a single character in the character array
		============================
		*/
		// get values of html entities
		let special_char_vals = match_with_empty(curr_word.val, /&[#a-zA-Z0-9]+;/g);
		// loop through html entities one by one and get their indices
		let curr_word_no_special = curr_word.val;
		let special_char_inds = [];
		for (j = 0; j < special_char_vals.length; j++) {
			let curr_special_val = special_char_vals[j];
			let special_val_ind = curr_word_no_special.indexOf(curr_special_val);
			special_char_inds.push(special_val_ind);
			curr_word_no_special = curr_word_no_special.replace(curr_special_val, " ");
		}
		// split word up to individual characters
		let multichar_arr = curr_word_no_special.split("");
		// add html entities back in
		for (j = 0; j < special_char_inds.length; j++) {
			let curr_ind = special_char_inds[j];
			let curr_val = special_char_vals[j];
			multichar_arr[curr_ind] = curr_val;
		}
		// escape regex characters
		for (j = 0; j < multichar_arr.length; j++) {
			multichar_arr[j] = escape_regex_chars(multichar_arr[j]);
		}
		/*
		============================
		Create regex statements to search for m[ion] tags to join
		============================
		*/
		// join characters with regex for <mi> and invisible tags to find instances
		let mi_split_str = "(?:" + mi_close + mo_invis_nattr + space + mi_open_nattr + ")*";
		let mi_regex = new RegExp(mi_open + multichar_arr.join(mi_split_str) + mi_close, "g");
		// for multi-char, also look for instances where the last character contains a superscript/subscript
		let main_char_regex = mi_open + multichar_arr.slice(0, multichar_arr.length - 1).join(mi_split_str);
		let last_char_regex = mi_close + space + '(<msubsup>)' + space + '<mrow>' + space + mi_open_nattr + multichar_arr[multichar_arr.length - 1] + mi_close + space + '</mrow>';
		let mi_script_regex = new RegExp(main_char_regex + last_char_regex, "g");
		// set replacement values for multi-char
		let mi_replace = "<mi$1>" + curr_word.val + "</mi>";
		let mi_script_replace = "$2<mrow>" + mi_replace + "</mrow>";
		/*
		============================
		Join m[ion] tags
		============================
		*/
		// multiplication
		if (curr_word.type === "m") {
			// add invisible multiplication between variables
			let var_mult = multichar_arr.join("</mi><mo>&it;</mo><mi>");
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, "<mi>" + var_mult + "</mi>");
		}
		// comma
		else if (curr_word.type === "c") {
			// add invisible comma between variables
			let var_comma = multichar_arr.join("</mi><mo>&ic;</mo><mi>");
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, "<mi>" + var_comma + "</mi>");
		}
		// variable
		else if (curr_word.type === "v" || curr_word.type === "a") {
			// join consecutive mi/mo/mn tags
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, mi_replace);
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_script_regex, mi_script_replace);
		}
		// function
		else if (curr_word.type === "f") {
			// add string for invisible function application
			let invis_func = "<mo>&af;</mo>";
			// join consecutive mi/mo/mn tags
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, mi_replace + invis_func);
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_script_regex, mi_script_replace + invis_func);
		}
	}
	// remove consecutive instances of invisible function
	multichar_mathml_text = multichar_mathml_text.replaceAll(/(<mo>&af;<\/mo>)+/g, "<mo>&af;</mo>");
	return multichar_mathml_text;
}
