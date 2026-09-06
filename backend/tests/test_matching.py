from app.matching import _jaccard, _tokenize, score_pair


def test_tokenize_lowercases_and_drops_stopwords():
    assert _tokenize("Breaking into Product Management") == {
        "breaking",
        "product",
        "management",
    }


def test_tokenize_combines_multiple_texts():
    assert _tokenize("hello world", "world peace") == {"hello", "world", "peace"}


def test_tokenize_ignores_none():
    assert _tokenize("hello", None) == {"hello"}


def test_jaccard_identical_sets_is_one():
    assert _jaccard({"a", "b"}, {"a", "b"}) == 1.0


def test_jaccard_disjoint_sets_is_zero():
    assert _jaccard({"a"}, {"b"}) == 0.0


def test_jaccard_both_empty_is_zero():
    assert _jaccard(set(), set()) == 0.0


def test_jaccard_partial_overlap():
    # {a} intersection over {a,b} union -> 1/2
    assert _jaccard({"a"}, {"a", "b"}) == 0.5


def test_score_pair_no_overlap_is_zero():
    score = score_pair(
        "breaking into product management",
        None,
        [],
        "learning to paint watercolors",
        None,
        [],
    )
    assert score == 0.0


def test_score_pair_full_text_and_tag_overlap_is_one():
    score = score_pair(
        "product management",
        None,
        ["first-gen"],
        "product management",
        None,
        ["first-gen"],
    )
    assert score == 1.0


def test_score_pair_weights_text_over_tags():
    # Full text overlap, no tag overlap: 0.7*1 + 0.3*0 = 0.7
    text_only = score_pair(
        "product management", None, [], "product management", None, ["first-gen"]
    )
    assert text_only == 0.7

    # No text overlap, full tag overlap: 0.7*0 + 0.3*1 = 0.3
    tags_only = score_pair(
        "product management",
        None,
        ["first-gen"],
        "watercolor painting",
        None,
        ["first-gen"],
    )
    assert tags_only == 0.3


def test_score_pair_other_tag_text_folds_into_text_overlap():
    score = score_pair(
        "guidance", "robotics", [], "guidance", "robotics", []
    )
    assert score == 0.7
