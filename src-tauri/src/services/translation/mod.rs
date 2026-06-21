pub mod google;

pub fn count_words(text: &str) -> usize {
    text.trim().split_whitespace().count()
}

pub fn should_use_google_translate(text: &str) -> bool {
    count_words(text) <= 2
}
