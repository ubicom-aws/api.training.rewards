export default {
	questions: [
		{
			question: "How would you rate the impact of the fixed bugs / new features on the project?",
			question_id: 'dev-1',
			answers: [
				{
					answer: "Very high - the amount of work is very high.",
					answer_id: 1,
					value: 30,
				},
				{
					answer: "High - the amount of work is high",
					answer_id: 2,
					value: 20,
				},
				{
					answer: "Average - the amount of work is average",
					answer_id: 3,
					value: 10,
				},
				{
					answer: "Low - the amount of work is low.",
					answer_id: 4,
					value: 5,
				},
				{
					answer: "Very Low - the amount of work is very little.",
					answer_id: 5,
					value: 0,
				},
			],
		},
		{
			question: "How would you rate the quality of the provided code?",
			question_id: 'dev-2',
			answers: [
				{
					answer: "Very high - the code follows all the best practices and/or is the opposite of trivial.",
					answer_id: 1,
					value: 30,
				},
				{
					answer: "High - the code follows nearly all the best practices and/or is not trivial at all. ",
					answer_id: 2,
					value: 20,
				},
				{
					answer: "Average - the code follows most the best practices and/or some parts of it are trivial.",
					answer_id: 3,
					value: 10,
				},
				{
					answer: "Low - the code doesn't really follow the best practices and/or a lot of it is trivial.",
					answer_id: 4,
					value: 5,
				},
				{
					answer: "Very low - the code doesn't follow the best practices and is completely trivial.",
					answer_id: 5,
					value: 0,
				}
			],
		},
		{
			question: "How do you rate the target project overall?",
			question_id: 'dev-3',
			answers: [
				{
					answer: "Very high - the project has a unique value, will (potentially) also be useful to a lot of people and has the potential to keep growing.",
					answer_id: 1,
					value: 20,
				},
				{
					answer: "High - the project isn't really unique but it is well maintained.",
					answer_id: 2,
					value: 15,
				},
				{
					answer: "Average - the project is limited or not very well maintained.",
					answer_id: 3,
					value: 10,
				},
				{
					answer: "Low - quality of the project overall is low.",
					answer_id: 4,
					value: 5,
				},
				{
					answer: "Very low - quality of the project overall is very low and not well maintained.",
					answer_id: 5,
					value: 0,
				}
			],
		},
	]
};