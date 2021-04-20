// general regex
const mi_open = '<m[ion]( *[a-z]+ *= *"[-# a-z]+")*>';
const mi_open_nattr = '<m[ion](?: *[a-z]+ *= *"[-# a-z]+")*>';
const mo_invis = '(<mo>&(?:(?:#x206[0-9])|(?:i[ct]));</mo>)*';
const mo_invis_nattr = '(?:<mo>&(?:(?:#x206[0-9])|(?:i[ct]));</mo>)*';
const mi_close = '</m[ion]>';
const space = '[\s \t\r\n]*';
const special_regex = /&[#a-zA-Z0-9]+;/g

// apply various functions to clean up mathml code from word paste
function format_mathml() {
	let word_mathml = document.getElementById("word").value.replaceAll("\r\n", "\n");
	// fix word-generated mathml tags
	let paste_mathml = word_mathml.replaceAll("mml:", "").replaceAll(' xmlns:mml="http://www.w3.org/1998/Math/MathML" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"', "").replaceAll(" ", " ").replaceAll("&#xA0", " ");
	// fix summations if formatting is valid
	if (document.getElementById("correct_indent").checked) {
		paste_mathml = format_summations(paste_mathml);
	}
	// remove extra spaces, as well as mspaces for now
	paste_mathml = replace_invisible_nbsp(paste_mathml);
	paste_mathml = rm_multispace(paste_mathml);
	paste_mathml = paste_mathml.replaceAll(/ *<mspace *\/ *>/g, "<mi> </mi>");
	// remove &af; for now
	paste_mathml = paste_mathml.replaceAll("<mo>&af;</mo>", "")
	// get array of multicharacter words
	let multichar_arr = document.getElementById("multichar").value.split("\n");
	// fix multicharacter words
	let paste_mathml_multichar = join_multichar_mi(paste_mathml, multichar_arr);
	// add in mspace
	let replace_mspace_regex = new RegExp(mi_open + ' *' + mi_close, "g");
	let paste_mathml_multichar_mspace = paste_mathml_multichar.replaceAll(replace_mspace_regex, "<mspace />");
	document.getElementById("paste").value = paste_mathml_multichar_mspace;
}

/* helper functions */

// add padding around mrow which has input regex, including indentation as its first group and remaining content as second
function add_mrow_padding(mathml_html, input_regex) {
	let padded_html = mathml_html;
	let matches = [...padded_html.matchAll(input_regex)];
	for (let i = 0; i < matches.length; i++) {
		// get mrow of text (based on having same indents as input line)
		let mrow_close = matches[i][1] + "</mrow>";
		// check for just bottom text
		let bot_regex = new RegExp(matches[i][0] + space + "<mrow>((.|\n)*?)\n" + mrow_close, "g");
		// add padding around contents of the mrow - change spacing before regex so it won't be matched again later
		padded_html = padded_html.replace(bot_regex, "\n" + matches[i][2] + '<mrow><mpadded lspace="-0.7em" voffset="-1ex">$1</mpadded></mrow>');

		// check for both top and bottom text
		let bot_top_regex = new RegExp('</mpadded></mrow>' + space + "<mrow>((.|\n)*?)\n" + mrow_close, "g");
		// add padding around contents of the mrow - change spacing before regex so it won't be matched again later
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
	edited_html = add_mrow_padding(edited_html, /\n( *)(<mo stretchy="false">(.*?)<\/mo>)/g);
	// pad spacing around summation
	edited_html = edited_html.replaceAll(/(<munder(over)*>(.|\n)*?<\/munder(over)*>)/g, '<mpadded height="+2ex" voffset="1ex">$1</mpadded>');
	return edited_html;
}

// assign type priorities
function type_prio(x) {
	if (x.type === "m") {
		return 0;
	}
	if (x.type === "c") {
		return 0;
	}
	if (x.type === "a") {
		return 1;
	}
	if (x.type === "v") {
		return 1;
	}
	if (x.type === "f") {
		return 1;
	}
}

// compare words
function sort_words(a, b) {
	// if two words are treated the same, sort by length in reverse
	if (type_prio(a) === type_prio(b)) {
		return a.val.length - b.val.length;
	}
	return type_prio(b) - type_prio(a);
}

// join consecutive mi for words in list
function join_multichar_mi(mathml_text, multichar_list) {
	let multichar_mathml_text = mathml_text;
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
	// sort list of words by what to do with them
	word_arr.sort(sort_words).reverse();
	// loop through each word
	for (i = 0; i < word_arr.length; i++) {
		let curr_word = word_arr[i];
		// get values and indices of entities
		let special_char_vals = curr_word.val.match(special_regex);
		if (special_char_vals === null) {
			special_char_vals = [];
		}
		// loop through entities one by one and get their indices
		let curr_word_no_special = curr_word.val
		let special_char_inds = []
		for (j = 0; j < special_char_vals.length; j++) {
			let curr_special_val = special_char_vals[j];
			let special_val_ind = curr_word_no_special.indexOf(curr_special_val);
			special_char_inds.push(special_val_ind);
			curr_word_no_special = curr_word_no_special.replace(curr_special_val, " ");
		}
		// split word up to individual characters and add entities back in
		let multichar_arr = curr_word_no_special.split("");
		for (j = 0; j < special_char_inds.length; j++) {
			let curr_ind = special_char_inds[j];
			let curr_val = special_char_vals[j];
			multichar_arr[curr_ind] = curr_val;
		}
		// escape regex characters
		for (j = 0; j < multichar_arr.length; j++) {
			multichar_arr[j] = escape_regex_chars(multichar_arr[j]);
		}
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
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, mi_replace);
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_script_regex, mi_script_replace);
		}
		// function
		else if (curr_word.type === "f") {
			// add string for invisible function application
			let invis_func = "<mo>&af;</mo>";
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_regex, mi_replace + invis_func);
			multichar_mathml_text = multichar_mathml_text.replaceAll(mi_script_regex, mi_script_replace + invis_func);
		}
	}
	// remove multiple instances of invisible function
	multichar_mathml_text = multichar_mathml_text.replaceAll(/(<mo>&af;<\/mo>)+/g, "<mo>&af;</mo>");
	return multichar_mathml_text;
}