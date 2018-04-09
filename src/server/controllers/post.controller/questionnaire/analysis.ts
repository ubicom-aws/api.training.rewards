export default {
	questions: [
		{
			question: "Were all relevant aspects or metrics around the objective analyzed?",
			question_id: 'analysis-1',
			answers: [
				{
					answer: "All or most of the relevant metrics were covered.",
					answer_id: 1,
					value: 15,
				},
				{
					answer: "Only selected metrics were chosen; including more might have provided additional insights.",
					answer_id: 2,
					value: 10,
				},
				{
					answer: "Only a single or narrow aspect was chosen.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "No.",
					answer_id: 4,
					value: 0,
				}],
		},
		{
			question: "How would you rate the complexity of extracting the data?",
			question_id: 'analysis-2',
			answers: [
				{
					answer: "Gathering the data required complex queries and post-processing",
					answer_id: 1,
					value: 15,
				},
				{
					answer: "The method of extracting data required transformation.",
					answer_id: 2,
					value: 10,
				},
				{
					answer: "No additional data transformation was needed.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "Script generated / one click data extraction.",
					answer_id: 4,
					value: 0,
				}],
		},
		{
			question: "How would you rate the visualization of the findings? ",
			question_id: 'analysis-3',
			answers: [
				{
					answer: "Visualizations were presented beyond expectation - a visualization such as an infographic was given to quickly understand the result of the analysis.",
					answer_id: 1,
					value: 10,
				},
				{
					answer: "Appropriate and sufficient visualization were used to understand the results.",
					answer_id: 2,
					value: 8,
				},
				{
					answer: "Had visualizations but most were irrelevant to the objective.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "Bad.",
					answer_id: 4,
					value: 0,
				}],
		},
		{
			question: "How would you rate the coherency of the analysis?",
			question_id: 'analysis-4',
			answers: [
				{
					answer: "Results of analysis were sorted accordingly and the writing style made the findings easily understandable.",
					answer_id: 1,
					value: 15,
				},
				{
					answer: "There were some connections in-between results, but all throughout the analysis.",
					answer_id: 2,
					value: 10,
				},
				{
					answer: "Results were presented but the results were not narrated effectively.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "Bad.",
					answer_id: 4,
					value: 0,
				}],
		},
		{
			question: "Is the analysis reproducible?",
			question_id: 'analysis-5',
			answers: [
				{
					answer: "All queries or data gathering methods and all data processing scripts were included.",
					answer_id: 1,
					value: 10,
				},
				{
					answer: "The core query or data gathering method was included and the data processing steps were described.",
					answer_id: 2,
					value: 8,
				},
				{
					answer: "Data gathering methods and processing steps were sketched.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "No.",
					answer_id: 4,
					value: 0,
				}],
		},
		{
			question: "Is it a new analysis?",
			question_id: 'analysis-6',
			answers: [
				{
					answer: "Yes.",
					answer_id: 1,
					value: 15,
				},
				{
					answer: "It’s similar to a previous contribution, but additional details/aspects were covered.",
					answer_id: 2,
					value: 10,
				},
				{
					answer: "It’s following-up or it’s similar to a previous contribution about a different time range or aspect of the project.",
					answer_id: 3,
					value: 5,
				},
				{
					answer: "Brings nothing new.",
					answer_id: 4,
					value: 0,
				}],
		},
	]
};