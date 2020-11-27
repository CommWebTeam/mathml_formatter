# MathML formatter
Takes in a line-separated list of side-by-side variables in the mathml document and groups instances of them together appropriately. By default, when copying variables from word, it does not recognize when a group of characters represents a single variable; each character is placed in its own separate <mi> tag and treated as a separate variable.

[HTML document here.](mathml.html)

It also does some basic formatting of the MathML code pasted from word, including:
- removing "mml:" in the tags
- removing the extra attributes in the math tags
- replacing any variables consisting solely of a space with mspace

## Variable list formatting
The list of side-by-side variables should be line-separated. Each line should consist of the variable name(s), followed by a space and then a single character of v, f, m, c, or a.

The single character indicates how the variable(s) should be treated:
- v (variable) indicates that the string consists of a single multi-character variable.
- f (function) indicates that the string consists of a single multi-character function.
- m (multiplication) indicates that the string consists of individual single-character variables multiplied together.
- c (comma) indicates that the string consists of individual single-character variables listed side-by-side.
- a (acronym) indicates that the string consists of a single multi-character acronym. These are currently treated identically to regular multi-character variables (v).

For v, f, and a, consecutive <mi> tags that each contain a character in the string are joined together. The tool also checks for a specific edge case where the final character in the string is part of a superscript of subscript tag.

For f, &af; is also added after the function.

For m and c, &it; and &ic; are respectively added between each character.

Note that variables/functions/acronyms are checked after multiplication/commas to find if a multicharacter variable is multiplied by another variable. Within these two groups, strings are sorted by length in descending order.

### Example
Given the following list:

ab f

cde v

cdef m

This will be sorted to

cdef m

cde v

ab f

1. &it will be inserted between all <mi> tags that consecutive contain c, then d, then e, then f.
2. All consecutive mi tags containing c, then d, then e (including those that have &it between) are joined into <mi>cde</mi>. 
3. All consecutive mi tags containing a then b are joined into <mi>ab</mi> and are followed by &af.
