export default {
	questions: [
		{
			question: "The user added a possible solution?",
			question_id: 'ideas-1',
			answers: [
				{
					answer: "Yes, technically detailed.",
					answer_id: 1,
					value: 30,
				},
				{
					answer: "Yes, but not technically detailed.",
					answer_id: 2,
					value: 10,
				},
				{
					answer: "No.",
					answer_id: 3,
					value: 0,
				}],
		},
		{
			question: "The suggestion is about a project with several alternatives? (Like Music Players, Chat Apps, etc.)",
			question_id: 'ideas-2',
			answers: [
				{
					answer: "Yes.",
					answer_id: 1,
					value: 0,
				},
				{
					answer: "No.",
					answer_id: 2,
					value: 20,
				},
			],
		},
		{
			question: "The user included information related to the project? (Like Link to download the app, official site, etc.)",
			question_id: 'ideas-3',
			answers: [
				{
					answer: "Very complete.",
					answer_id: 1,
					value: 30,
				},
				{
					answer: "Not very complete but enough to gather additional information.",
					answer_id: 2,
					value: 10,
				},
				{
					answer: "No",
					answer_id: 3,
					value: 0,
				}],
		},
	]
};