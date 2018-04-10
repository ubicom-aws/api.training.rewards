export default {
	questions: [
		{
			question: "How would you classify this copywriting work?",
			question_id: 'copy-1',
			answers: [
				{
					answer: "Extended (at least 1,500 words in total).",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "Long (at least 800 words in total).",
					answer_id: 2,
					value: 15,
				},
				{
					answer: "Medium (at least 400 words in total).",
					answer_id: 3,
					value: 10,
				},
				{
					answer: "Short (at least 100 words in total).",
					answer_id: 4,
					value: 5,
				},
				{
					answer: "Minimal (less than 100 words in total).",
					answer_id: 5,
					value: 0,
				}],
		},
		{
			question: "How is the grammar and style of the content?",
			question_id: 'copy-2',
			answers: [
				{
					answer: "Polished and well-written.",
					answer_id: 1,
					value: 10,
				},
				{
					answer: "Good, but has room for improvement.",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "Has a few errors that need to be corrected or lacks consistency of style.",
					answer_id: 3,
					value: 2,
				},
				{
					answer: "It’s quite bad.",
					answer_id: 4,
					value: 0,
				}],
		},
		{
			question: "How relevant is the content to the project's needs?",
			question_id: 'copy-3',
			answers: [
				{
					answer: "Highly relevant and valuable.",
					answer_id: 1,
					value: 10,
				},
				{
					answer: "Relevant but offers little unique value",
					answer_id: 2,
					value: 5,
				},
				{
					answer: "Does not adequately meet the project’s needs.",
					answer_id: 3,
					value: 0,
				}],
		},
		{
			question: "Has the content been adopted by the Project Owner (i.e. merged pull requests or content is now used)?",
			question_id: 'copy-4',
			answers: [
				{
					answer: "Yes, the content is now being used by the Project Owner.",
					answer_id: 1,
					value: 10,
				},
				{
					answer: "No, the content has not been used yet.",
					answer_id: 2,
					value: 0,
				},],
		},
	]
};