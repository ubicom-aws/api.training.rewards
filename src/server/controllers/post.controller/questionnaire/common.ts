export default {
	questions: [
		{
			question: "Does the writing style meet the Utopian standard considering formalness, informativeness and clarity of the content?",
			question_id: 'c-1',
			answers: [
				{
					answer: "It is formal, informative and well written with clear content.",
					answer_id: 1,
					value: 5,
				},
				{
					answer: "It is informative with clear content but not formal enough.",
					answer_id: 2,
					value: 4,
				},
				{
					answer: "The contribution could be more informative or contains unrelated information, formality and clarity of the content are good enough.",
					answer_id: 3,
					value: 3,
				},
				{
					answer: "Not all sections were clear enough but overall holds value for the project.",
					answer_id: 4,
					value: 2,
				},
				{
					answer: "Not at all.",
					answer_id: 5,
					value: 0,
				}
			],
		},
		{
			question: "Was the provided category template for the editor followed?",
			question_id: 'c-2',
			answers: [
				{
					answer: "All points of the template were included with additional points as well.",
					answer_id: 1,
					value: 5,
				},
				{
					answer: "The template was followed without additions.",
					answer_id: 2,
					value: 4,
				},
				{
					answer: "The template was edited but the points were covered in different way.",
					answer_id: 3,
					value: 3,
				},
				{
					answer: "Not all points of the template were covered in the contribution but the structure is clear enough.",
					answer_id: 4,
					value: 3,
				},
				{
					answer: "The template was not followed but the structure is clear enough.",
					answer_id: 5,
					value: 2,
				},
				{
					answer: "The contents are not clearly structured at all.",
					answer_id: 6,
					value: 0,
				}
			],
		},
		{
			question: "Did the contributor tag other users?",
			question_id: 'c-3',
			answers: [
				{
					answer: "No other users were tagged by the contributor.",
					answer_id: 1,
					value: 5,
				},
				{
					answer: "Used tags are reasonable and all tagged people are connected to the project and/or the contribution.",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "The contribution contains mentions of other users that are not directly related to the contribution but related in other ways.",
					answer_id: 3,
					value: 2,
				},
				{
					answer: "The contributor misuses tagging of other users.",
					answer_id: 4,
					value: 0,
				},
			]
		},

		{
			question: "Did the contributor ask for upvotes, resteems, follows or witness vote?",
			question_id: 'c-4',
			answers: [
				{
					answer: "No",
					answer_id: 1,
					value: 5,
				},
				{
					answer: "Yes, but not in a way that disturbs readability. ",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "Yes.",
					answer_id: 3,
					value: 0,
				}],
		},
		{
			question: "Was a graphical content like images, charts, videos or screenshots included?",
			question_id: 'c-5',
			answers: [
				{
					answer: "Yes, the graphical content is included and adds more value to the contribution.",
					answer_id: 1,
					value: 5,
				},
				{
					answer: "No but the contribution works well without graphical content well.",
					answer_id: 2,
					value: 4,
				},
				{
					answer: "Yes, but most of the graphical content’s purpose is just for presentational matters.",
					answer_id: 3,
					value: 3,
				},
				{
					answer: "No relevant or useful graphical content is included in the contribution.",
					answer_id: 4,
					value: 0,
				},
				],
		},
		{
			question: "How would you rate the overall added value?",
			question_id: 'c-6',
			answers: [
				{
					answer: "Extraordinary value to both the project and the open source community overall.",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "Significant value to the project or open source community.",
					answer_id: 2,
					value: 15,
				},
				{
					answer: "Some value to the project or open source community.",
					answer_id: 3,
					value: 10,
				},
				{
					answer: "Little value to the project or open source community.",
					answer_id: 4,
					value: 5,
				},
				{
					answer: "No obvious value to project or open source community.",
					answer_id: 5,
					value: 0,
				},
			],
		},
	]
};