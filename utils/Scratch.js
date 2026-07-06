const cheerio = require("cheerio");

/**
 * Collapse whitespace and trim.
 * @param {string} text
 * @returns {string}
 */
const cleanText = (text) => text.replace(/\s+/g, " ").trim();

/**
 * Parse the HTML returned by Scratch's site-api comment endpoints into a
 * structured list of top-level comments (with their replies nested inside).
 * @param {string} html
 * @returns {ScratchComment[]}
 */
const parseComments = (html) => {
    const $ = cheerio.load(html);
    const comments = [];

    $(".top-level-reply").each((_i, element) => {
        const commentId = $(element).find(".comment").attr("data-comment-id");
        const user = $(element)
            .find("#comment-user")
            .attr("data-comment-user");
        const originalContent = cleanText($(element).find(".content").text());
        const time = $(element).find(".time").attr("title");
        const timestamp = time ? new Date(time).getTime() : NaN;

        const replies = [];
        let firstReplyContent = null;

        $(element)
            .find(".reply")
            .each((_j, replyElement) => {
                const rCommentId = $(replyElement)
                    .find(".comment")
                    .attr("data-comment-id");
                const rUser = $(replyElement)
                    .find("#comment-user")
                    .attr("data-comment-user");
                const rContent = cleanText(
                    $(replyElement).find(".content").text(),
                );
                const rTime = $(replyElement).find(".time").attr("title");
                const replyTimestamp = rTime ? new Date(rTime).getTime() : NaN;

                if (rUser && rContent) {
                    replies.push({
                        commentID: rCommentId,
                        user: rUser,
                        content: rContent,
                        timestamp: replyTimestamp,
                    });

                    if (firstReplyContent === null) {
                        firstReplyContent = rContent;
                    }
                }
            });

        let topLevelContent = originalContent;
        if (firstReplyContent) {
            const splitIndex = originalContent.indexOf(firstReplyContent);
            if (splitIndex !== -1) {
                topLevelContent = originalContent
                    .substring(0, splitIndex)
                    .trim();
            }
        }

        comments.push({
            commentID: commentId,
            user,
            content: topLevelContent,
            timestamp,
            hasreplies: replies.length > 0,
            replies,
        });
    });

    return comments;
};

/**
 * Fetch a URL and return the response body as text, throwing if the
 * upstream request failed.
 * @param {string} url
 * @returns {Promise<string>}
 */
const fetchHtml = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Upstream request failed with status ${res.status}`);
    }
    return res.text();
};

/**
 * Get every comment (and its replies) left on a Scratch user's profile.
 * @param {string} username
 * @returns {Promise<ScratchComment[]>}
 */
const getUserComments = async (username) => {
    const html = await fetchHtml(
        `https://scratch.mit.edu/site-api/comments/user/${username}/`,
    );
    return parseComments(html);
};

/**
 * Get every comment (and its replies) left on a Scratch studio.
 * @param {string} studioId
 * @returns {Promise<ScratchComment[]>}
 */
const getStudioComments = async (studioId) => {
    const html = await fetchHtml(
        `https://scratch.mit.edu/site-api/comments/gallery/${studioId}/`,
    );
    return parseComments(html);
};

/**
 * Get every comment (and its replies) left on a Scratch project.
 * @param {string} projectId
 * @returns {Promise<ScratchComment[]>}
 */
const getProjectComments = async (projectId) => {
    const html = await fetchHtml(
        `https://scratch.mit.edu/site-api/comments/project/${projectId}/`,
    );
    return parseComments(html);
};

module.exports = {
    parseComments,
    getUserComments,
    getStudioComments,
    getProjectComments,
};
