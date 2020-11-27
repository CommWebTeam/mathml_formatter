# MathML formatter
Takes in a line-separated list of multi-character variables in the mathml document and joins instances of them together into a single <mi> tag, instead of each character being in its separate <mi> tag (which is how variables are formatted by default when pasting from word).

[HTML document here.](mathml.html)

It also does some basic formatting of the MathML code pasted from word, including:
- removing "mml:" in the tags
- removing the extra attributes in the math tags
- replacing any variables consisting solely of a space with mspace
