export default {
	questions: [
		{
			question: "What kind of blog post is it?",
			question_id: 'blog-1',
			answers: [
				{
					answer: "Project introduction.",
					answer_id: 1,
					value: 10,
				},
				{
					answer: "Project promotion.",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "Development log.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "Project Generic News.",
					answer_id: 4,
					value: 5,
				},
				{
					answer: "None of the above.",
					answer_id: 5,
					value: 0,
				}],
		},
		{
			question: "How many words does the blog post have?",
			question_id: 'blog-2',
			answers: [
				{
					answer: "More than 1,250 words.",
					answer_id: 1,
					value: 30,
				},
				{
					answer: "1,000-1,250 words.",
					answer_id: 2,
					value: 20,
				},
				{
					answer: "750-1,000 words.",
					answer_id: 3,
					value: 15,
				},
				{
					answer: "500-750 words.",
					answer_id: 4,
					value: 10,
				},
				{
					answer: "Less than 500 words.",
					answer_id: 5,
					value: 0,
				}],
		},
		{
			question: "How is the blog’s post structure?",
			question_id: 'blog-3',
			answers: [
				{
					answer: "The blog post is well written with coherent structure.",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "The post contains some mistakes in the structure.",
					answer_id: 2,
					value: 15,
				},
				{
					answer: "The post would benefit from some reworking.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "Structure isn't coherent at all.",
					answer_id: 4,
					value: 0,
				}],
		},
		{
			question: "Is the post part of a series?",
			question_id: 'blog-4',
			answers: [
				{
					answer: "The post is part of an ongoing series.",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "It the first post of a series. ",
					answer_id: 2,
					value: 10,
				},
				{
					answer: "No.",
					answer_id: 3,
					value: 0,
				}
			],
		},
	]
};