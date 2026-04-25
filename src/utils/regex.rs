/// Escapes special regex characters in a string so it can be used as a literal pattern.
pub fn regex_escape(input: &str) -> String {
    let special_chars = ['.', '^', '$', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|', '\\'];
    let mut escaped = String::with_capacity(input.len() * 2);
    for ch in input.chars() {
        if special_chars.contains(&ch) {
            escaped.push('\\');
        }
        escaped.push(ch);
    }
    escaped
}
