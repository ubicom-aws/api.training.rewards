export default {
    questions: [
        {
            question: "Does the tutorial address a minimum of 3 substantial concepts and no more than 5?",
            question_id: 'vtut-1',
            answers: [
                {
                    answer: "3-5 substantial concepts covered in the tutorial.",
                    answer_id: 1,
                    value: 20,
                },
                {
                    answer: "Less than 3 or more than 5 substantial concepts covered in the tutorial.",
                    answer_id: 2,
                    value: 10,
                },
                {
                    answer: "No substantial or recognisable concepts.",
                    answer_id: 3,
                    value: 0,
                }],
        },
        {
            question: "Concepts covered in the tutorial are indicated in the post text with a short description of each concept and when appropriate, images?",
            question_id: 'vtut-2',
            answers: [
                {
                    answer: "Thorough text and images for concepts covered.",
                    answer_id: 1,
                    value: 10,
                },
                {
                    answer: "Minimal text and images.",
                    answer_id: 2,
                    value: 5,
                },
                {
                    answer: "No or very little text and images.",
                    answer_id: 3,
                    value: 0,
                }],
        },
        {
            question: "Does the contributor provide supplementary resources, such as code and sample files in the contribution post or a GitHub repository?",
            question_id: "vtut-3",
            answers: [
                {
                    answer: "Yes",
                    answer_id: 1,
                    value: 10,
                },
                {
                    answer: "No",
                    answer_id: 2,
                    value: 0,
                }],
        },
        {
            question: "Is the tutorial part of a series?",
            question_id: "vtut-4",
            answers: [
                {
                    answer: "Yes.",
                    answer_id: 1,
                    value: 10,
                },
                {
                    answer: "Yes, but first entry in the series.",
                    answer_id: 2,
                    value: 5,
                },
                {
                    answer: "No.",
                    answer_id: 3,
                    value: 0,
                }
            ],
        },
        {
            question: "Is there an outline for the tutorial content at the beginning of the post?",
            question_id: "vtut-5",
            answers: [
                {
                    answer: "Yes.",
                    answer_id: 1,
                    value: 5,
                },
                {
                    answer: "Yes, but not detailed enough or does not cover all sections.",
                    answer_id: 2,
                    value: 3,
                },
                {
                    answer: "No.",
                    answer_id: 3,
                    value: 0,
                }
            ],
        },
        {
            question: "Does the presenter speak clearly and is easily understandable?",
            question_id: "vtut-6",
            answers: [
                {
                    answer: "Yes.",
                    answer_id: 1,
                    value: 15,
                },
                {
                    answer: "Mostly understandable.",
                    answer_id: 2,
                    value: 5,
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
