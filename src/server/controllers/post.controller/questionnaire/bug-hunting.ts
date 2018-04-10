export default {
	questions: [
		{
			question: "What was the bug severity level?",
			question_id: 'bug-1',
			answers: [
				{
					answer: "Critical",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "Major",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "Minor",
					answer_id: 3,
					value: 2,
				},
				{
					answer: "Trivial",
					answer_id: 4,
					value: 0,
				}
			],
		},
		{
			question: "Were the steps to reproduce easy to understand?",
			question_id: 'bug-2',
			answers: [
				{
					answer: "Yes, well Written",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "No, needed some more clarification.",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "Not at all.",
					answer_id: 3,
					value: 0,
				},
			],
		},
		{
			question: "Has the user provided the video/gif or any clear evidence of the bug?",
			question_id: 'bug-3',
			answers: [
				{
					answer: "Yes, accurate and to the point.",
					answer_id: 1,
					value: 10,
				},
				{
					answer: "No, only steps to reproduce were given.",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "No.",
					answer_id: 3,
					value: 0,
				},
			],
		},
	]
};