"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _this = this;
var probot_scheduler_1 = __importDefault(require("probot-scheduler"));
var moment_1 = __importDefault(require("moment"));
var config_1 = __importDefault(require("./config"));
var state = {
    hasLoadedConfig: false,
    hasCreatedLabels: false,
    labels: [],
};
var config;
var schedulerOptions = {
    delay: true,
    interval: 1 * 60 * 60 // 1 hour
};
var removeExistingLabelsFromPullRequest = function (context, pullRequest, shouldRemoveAll) {
    if (shouldRemoveAll === void 0) { shouldRemoveAll = false; }
    return __awaiter(_this, void 0, void 0, function () {
        var issueParams, labelToBeAdded, existingLabels, labels, _i, labels_1, label;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context.log('Removing exisiting labels from pull request', pullRequest.number, 'shouldRemoveAll', shouldRemoveAll);
                    issueParams = context.issue();
                    labelToBeAdded = getLabelToBeAddedToPullRequest(pullRequest);
                    existingLabels = pullRequest.labels;
                    labels = labelToBeAdded && !shouldRemoveAll ?
                        existingLabels.filter(function (l) { return l.name !== labelToBeAdded.name; }) :
                        existingLabels;
                    _i = 0, labels_1 = labels;
                    _a.label = 1;
                case 1:
                    if (!(_i < labels_1.length)) return [3 /*break*/, 4];
                    label = labels_1[_i];
                    context.log('Removing Label...', label, 'from pull request', pullRequest.number);
                    return [4 /*yield*/, context.github.issues.removeLabel(__assign({}, issueParams, { issue_number: pullRequest.number, name: label.name }))];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
};
var getLabelToBeAddedToPullRequest = function (pullRequest) {
    var codeReviewTimeWindow = config.codeReviewTimeWindow, reminderCount = config.reminderCount;
    var timeIncrement = codeReviewTimeWindow / reminderCount;
    var now = moment_1.default();
    var elapsedTime = moment_1.default(now).diff(pullRequest.created_at, 'milliseconds');
    var _loop_1 = function (i) {
        if (elapsedTime >= timeIncrement * i) {
            var label = state.labels.find(function (l) { return l.name.split(' ').length >= i; });
            if (label)
                return { value: label };
        }
    };
    for (var i = reminderCount; i >= 1; i--) {
        var state_1 = _loop_1(i);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    return undefined;
};
var pullRequestAlreadyHasLabel = function (pullRequest, label) {
    var existingLabels = pullRequest.labels;
    return !!existingLabels.find(function (l) { return l.name === label.name; });
};
var addLabelToPullRequest = function (context, pullRequest) { return __awaiter(_this, void 0, void 0, function () {
    var issueParams, label;
    return __generator(this, function (_a) {
        issueParams = context.issue();
        label = getLabelToBeAddedToPullRequest(pullRequest);
        if (!label)
            return [2 /*return*/];
        if (pullRequestAlreadyHasLabel(pullRequest, label))
            return [2 /*return*/];
        context.log('Adding Label...', label, 'to pull request', pullRequest.number);
        return [2 /*return*/, context.github.issues.addLabels(__assign({}, issueParams, { issue_number: pullRequest.number, labels: [label.name] }))];
    });
}); };
var createLabels = function (context) { return __awaiter(_this, void 0, void 0, function () {
    var issueParams, emoji, color, reminderCount, label, i, _i, _a, l, e_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                issueParams = context.issue();
                emoji = config.emoji, color = config.labelColor, reminderCount = config.reminderCount;
                label = '';
                for (i = 1; i <= reminderCount; i++) {
                    label += emoji + " ";
                    state.labels.push({
                        name: label.trim(),
                        color: color
                    });
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 6, , 7]);
                _i = 0, _a = state.labels;
                _b.label = 2;
            case 2:
                if (!(_i < _a.length)) return [3 /*break*/, 5];
                l = _a[_i];
                return [4 /*yield*/, context.github.issues.createLabel(__assign({}, issueParams, l))];
            case 3:
                _b.sent();
                _b.label = 4;
            case 4:
                _i++;
                return [3 /*break*/, 2];
            case 5: return [3 /*break*/, 7];
            case 6:
                e_1 = _b.sent();
                context.log('Unable to create labels!', e_1.errors);
                return [3 /*break*/, 7];
            case 7:
                state.hasCreatedLabels = true;
                return [2 /*return*/];
        }
    });
}); };
var runOnAllPullRequests = function (context, callback, state) {
    if (state === void 0) { state = 'open'; }
    return __awaiter(_this, void 0, void 0, function () {
        var shouldIgnoreDraftPullRequests, pullRequestParams, pullRequestsResponse, allOpenRequests, pulls, _i, pulls_1, pull;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    shouldIgnoreDraftPullRequests = config.shouldIgnoreDraftPullRequests;
                    pullRequestParams = context.issue();
                    return [4 /*yield*/, context.github.pulls.list(__assign({}, pullRequestParams, { state: state }))];
                case 1:
                    pullRequestsResponse = _a.sent();
                    if (!(pullRequestsResponse && pullRequestsResponse.data))
                        return [2 /*return*/];
                    allOpenRequests = pullRequestsResponse.data;
                    pulls = (shouldIgnoreDraftPullRequests ?
                        allOpenRequests.filter(function (pull) { return !pull.draft; }) :
                        allOpenRequests);
                    _i = 0, pulls_1 = pulls;
                    _a.label = 2;
                case 2:
                    if (!(_i < pulls_1.length)) return [3 /*break*/, 5];
                    pull = pulls_1[_i];
                    return [4 /*yield*/, callback(context, pull)];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5: return [2 /*return*/];
            }
        });
    });
};
module.exports = function (app) {
    probot_scheduler_1.default(app, schedulerOptions);
    app.on('schedule.repository', function (context) { return __awaiter(_this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!state.hasLoadedConfig) return [3 /*break*/, 5];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, context.config('code-review-timer.yml')];
                case 2:
                    config = (_a.sent());
                    return [3 /*break*/, 5];
                case 3:
                    e_2 = _a.sent();
                    context.log('No configuration found. Using defaults.');
                    config = __assign({}, config_1.default);
                    return [3 /*break*/, 5];
                case 4:
                    state.hasLoadedConfig = true;
                    return [7 /*endfinally*/];
                case 5:
                    schedulerOptions.interval = config.pollIntervalTime;
                    if (!state.hasCreatedLabels)
                        createLabels(context);
                    return [4 /*yield*/, runOnAllPullRequests(context, removeExistingLabelsFromPullRequest)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, runOnAllPullRequests(context, addLabelToPullRequest)];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    app.on('pull_request.closed', function (context) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    context.log('Pull request closed...');
                    return [4 /*yield*/, runOnAllPullRequests(context, function (context, pullRequest) { return removeExistingLabelsFromPullRequest(context, pullRequest, true); }, 'closed')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
};
//# sourceMappingURL=index.js.map