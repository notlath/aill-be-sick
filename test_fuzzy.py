from rapidfuzz import fuzz

def test_fuzz():
    term = "puting pantal sa balat"
    text = "pulang pantal sa balat ko"
    
    term_word_count = len(term.split())
    words = text.split()
    
    for i in range(len(words) - term_word_count + 1):
        window = " ".join(words[i : i + term_word_count])
        score = fuzz.ratio(term, window)
        print(f"Term: '{term}', Window: '{window}', Score: {score}")

test_fuzz()
