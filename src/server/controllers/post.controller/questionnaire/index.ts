import ideasQuestions from "./ideas";
import developmentQuestions from "./development";
import graphicsQuestions from "./graphics";
import bughuntingQuestions from "./bug-hunting";
import translationsQuestions from "./translations";
import analysisQuestions from "./analysis";
import socialQuestions from "./social";
import documentationQuestions from "./documentation";
import tutorialsQuestions from "./tutorials";
import videotutorialsQuestions from "./video-tutorials";
import copywritingQuestions from "./copywriting";
import blogQuestions from "./blog";
import taskRequestQuestions from "./task-requests";
import common from "./common";

const QualitySlider = {
	// Main cetegories
	'ideas': {
		...ideasQuestions,
		...common
	},
	'development': {
		...developmentQuestions,
		...common,
	}, // Done
	'graphics': {
		...graphicsQuestions,
		...common,
	}, // Done
	'bug-hunting': {
		...bughuntingQuestions,
		...common,
	}, // Done
	'translations': {
		...translationsQuestions,
		...common,
	}, // Done
	'analysis': {
		...analysisQuestions,
		...common,
	}, // Done
	'social': {
		...socialQuestions,
		...common,
	}, // Done
	'documentation': {
		...documentationQuestions,
		...common,
	}, // Done
	'tutorials': {
		...tutorialsQuestions,
		...common,
	}, // Done
	"video-tutorials": {
		...videotutorialsQuestions,
		...common,
	}, // Done
	'copywriting': {
		...copywritingQuestions,
		...common,
	}, // Done
	'blog': blogQuestions, // Done

	// Task Requests // Done
	'task-ideas': {
		...taskRequestQuestions,
		...common,
	},
	'task-development': {
		...taskRequestQuestions,
		...common,
	},
	'task-bug-hunting': {
		...taskRequestQuestions,
		...common,
	},
	'task-documentation': {
		...taskRequestQuestions,
		...common,
	},
	'task-translations': {
		...taskRequestQuestions,
		...common,
	},
	'task-analysis': {
		...taskRequestQuestions,
		...common,
	},
	'task-graphics': {
		...taskRequestQuestions,
		...common,
	},
	'task-social': {
		...taskRequestQuestions,
		...common,
	},
};

export default QualitySlider;

