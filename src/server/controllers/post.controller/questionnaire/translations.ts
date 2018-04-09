export default {
	questions: [
		{
			question: "Is the project description formal?",
			question_id: 1,
			answers: [
			{
				answer: "Yes it’s straight to the point",
				answer_id: 1,
				value: 10,
			},
			{
				answer: "Need more description ",
				answer_id: 2,
				value: 5,
			},
			{
				answer: "Not too descriptive",
				answer_id: 3,
				value: 0,
			}],
		},
		{
			question: "Is the language / grammar correct?",
			question_id: 2,
			answers: [
			{
				answer: "Yes",
				answer_id: 1,
				value: 20,
			},
			{
				answer: "A few mistakes",
				answer_id: 2,
				value: 10,
			},
			{
				answer: "It's pretty bad",
				answer_id: 3,
				value: 0,
			}],
		},
		{
			question: "Was the template followed?",
			question_id: 3,
			answers: [
			{
				answer: "Yes",
				answer_id: 1,
				value: 10,
			},
			{
				answer: "Partially",
				answer_id: 2,
				value: 5,
			},
			{
				answer: "No",
				answer_id: 3,
				value: 0,
			}],
		},

		// Topic related questions
		{
			question: "How many translated words?",
			question_id: 4,
			answers: [
			{
				answer: "2000+",
				answer_id: 1,
				value: 10,
			},
			{
				answer: "1500-2000",
				answer_id: 2,
				value: 5,
			},
			{
				answer: "1000-1500",
				answer_id: 3,
				value: 0,
			}
			],
		},
		{
			question: "Are there any traces of machine translation making the work inaccurate?",
			question_id: 5,
			answers: [
			{
				answer: "No",
				answer_id: 1,
				value: 5,
			},
			{
				answer: "Yes",
				answer_id: 2,
				value: 0,
			}
			],
		},
		{
			question: "Is there code that shouldn’t be translated?",
			question_id: 6,
			answers: [
			{
				answer: "No",
				answer_id: 1,
				value: 20,
			},
			{
				answer: "Yes",
				answer_id: 2,
				value: 0,
			}
			],
		},
		{
			question: "Is this a proofreading contribution?",
			question_id: 7,
			answers: [
			{
				answer: "Yes",
				answer_id: 1,
				value: 5,
			},
			{
				answer: "No",
				answer_id: 2,
				value: 0,
			}
			],
		}
	]
};