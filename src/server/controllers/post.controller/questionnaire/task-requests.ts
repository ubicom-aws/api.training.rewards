export default {
	questions: [
		{
			question: "Is the task described in great details?",
			question_id: 'task-1',
			answers: [
			{
				answer: "Yes, with great details.",
				answer_id: 1,
				value: 10,
			},
			{
				answer: "Yes, but not much information.",
				answer_id: 2,
				value: 5,
			},
			{
				answer: "No",
				answer_id: 3,
				value: 0,
			}],
		},
		{
			question: "Is there a guide on completing the tasks?",
			question_id: 'task-2',
			answers: [
			{
				answer: "Yes, with great details.",
				answer_id: 1,
				value: 10,
			},
			{
				answer: "Yes, but not much information.",
				answer_id: 2,
				value: 5,
			},
			{
				answer: "No.",
				answer_id: 3,
				value: 0,
			}],
		},
		{
			question: "Is there a deadline for this task request?",
			question_id: 'task-3',
			answers: [
			{
				answer: "Yes, considerably enough time to complete the task.",
				answer_id: 1,
				value: 5,
			},
			{
				answer: "Yes, but too short.",
				answer_id: 2,
				value: 2,
			},
			{
				answer: "No.",
				answer_id: 3,
				value: 0,
			}
			],
		},
		{
			question: "Did the project owner provide enough details for the contributors to get in touch?",
			question_id: 'task-4',
			answers: [
				{
					answer: "Yes.",
					answer_id: 1,
					value: 5,
				},
				{
					answer: "No.",
					answer_id: 2,
					value: 0,
				},
			],
		},
		{
			question: "Did the project owner provide a liquid bounty (STEEM or other cryptos)?",
			question_id: 'task-6',
			answers: [
				{
					answer: "Yes.",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "No.",
					answer_id: 2,
					value: 0,
				},
			],
		},
	]
};