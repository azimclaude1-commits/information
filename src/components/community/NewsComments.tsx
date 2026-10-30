import React, { useId, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Send,
  ThumbsUp,
  X,
} from "lucide-react";
import { DateLabel } from "../live/LiveShared";
import { ME, label, personName, uid } from "../live/liveState";
import { CommunityPagination, ProfileAvatar, useCommunity } from "./Community";
import { commentCount, type Comment } from "./communityState";

export function NewsComments({ postId }: { postId: string }) {
  const c = useCommunity(),
    id = useId(),
    input = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false),
    [text, setText] = useState(""),
    [reply, setReply] = useState<Comment | null>(null);
  const [sort, setSort] = useState("latest"),
    [page, setPage] = useState(0),
    [error, setError] = useState("");
  const items = c.state.comments.filter((v) => v.postId === postId);
  const count = commentCount(c.state, postId);
  const roots = items
    .filter(
      (v) =>
        !v.parentId &&
        (!v.deleted || items.some((r) => r.parentId === v.id && !r.deleted)),
    )
    .sort((a, b) =>
      sort === "hot"
        ? b.likes + Number(b.liked) - a.likes - Number(a.liked) || b.at - a.at
        : b.at - a.at,
    );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(roots.length / 8) - 1),
  );
  const startReply = (comment: Comment) => {
    setReply(comment);
    setError("");
    input.current?.focus();
  };
  const renderComment = (comment: Comment) => {
    const profile = c.profile(comment.userId);
    return (
      <div
        className={`community-comment ${comment.parentId ? "is-reply" : ""}`}
        key={comment.id}
      >
        <ProfileAvatar id={comment.userId} />
        <div className="community-comment-main">
          <div className="community-comment-byline">
            <button onClick={() => c.openProfile(comment.userId)}>
              {personName(profile, c.lang)}
            </button>
            {comment.userId === ME && <span>{label(c.lang, "我", "You")}</span>}
            <time>
              <DateLabel at={comment.at} lang={c.lang} />
            </time>
          </div>
          <p>
            {comment.deleted ? (
              label(c.lang, "该评论已删除", "Comment deleted")
            ) : (
              <>
                {comment.replyTo && (
                  <span className="community-reply-to">
                    {label(c.lang, "回复", "Reply to")}{" "}
                    {personName(c.profile(comment.replyTo), c.lang)}：{" "}
                  </span>
                )}
                {comment.text}
              </>
            )}
          </p>
          {!comment.deleted && (
            <div className="community-comment-actions">
              <button
                aria-label={label(
                  c.lang,
                  `赞同${profile.name}的评论`,
                  `Like ${profile.nameEn}'s comment`,
                )}
                aria-pressed={comment.liked}
                onClick={() => c.dispatch({ type: "like", id: comment.id })}
              >
                <ThumbsUp size={13} />
                {comment.likes + Number(comment.liked)}
              </button>
              <button onClick={() => startReply(comment)}>
                {label(c.lang, "回复", "Reply")}
              </button>
              {comment.userId === ME && (
                <button
                  onClick={() => {
                    c.dispatch({ type: "delete", id: comment.id });
                    if (reply?.id === comment.id) setReply(null);
                  }}
                >
                  {label(c.lang, "删除", "Delete")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <section
      className="community-comments"
      aria-label={label(c.lang, "资讯评论", "News comments")}
    >
      <button
        className="community-comment-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <MessageCircle size={15} />
        <span>
          {count} {label(c.lang, "条评论", "comments")}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="community-comment-panel" id={id}>
          <div className="community-comment-head">
            <strong>{label(c.lang, "全部评论", "All comments")}</strong>
            <div className="ui-seg">
              <button
                aria-pressed={sort === "latest"}
                onClick={() => {
                  setSort("latest");
                  setPage(0);
                }}
              >
                {label(c.lang, "最新", "Latest")}
              </button>
              <button
                aria-pressed={sort === "hot"}
                onClick={() => {
                  setSort("hot");
                  setPage(0);
                }}
              >
                {label(c.lang, "热门", "Top")}
              </button>
            </div>
          </div>
          <div className="community-comment-list">
            {roots.slice(currentPage * 8, currentPage * 8 + 8).map((root) => (
              <div className="community-comment-thread" key={root.id}>
                {renderComment(root)}
                {items
                  .filter((r) => r.parentId === root.id && !r.deleted)
                  .sort((a, b) => a.at - b.at)
                  .map(renderComment)}
              </div>
            ))}
            {!count && (
              <p className="community-comment-empty">
                {label(
                  c.lang,
                  "暂无评论，来聊聊你的看法",
                  "Be the first to share your thoughts",
                )}
              </p>
            )}
          </div>
          <CommunityPagination
            page={currentPage}
            count={roots.length}
            onChange={setPage}
          />
          <form
            className="community-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim()) return;
              if (
                reply &&
                !items.some((item) => item.id === reply.id && !item.deleted)
              ) {
                setError(
                  label(
                    c.lang,
                    "这条评论已删除，请取消回复后重新发送",
                    "This comment was deleted. Cancel the reply to continue.",
                  ),
                );
                return;
              }
              c.dispatch({
                type: "add",
                id: uid(),
                postId,
                text,
                at: Date.now(),
                replyId: reply?.id,
              });
              setText("");
              setReply(null);
              setSort("latest");
              const replyRoot = reply?.parentId || reply?.id;
              const targetIndex = replyRoot
                ? [...roots]
                    .sort((a, b) => b.at - a.at)
                    .findIndex((root) => root.id === replyRoot)
                : 0;
              setPage(Math.floor(Math.max(0, targetIndex) / 8));
              setError("");
            }}
          >
            {reply && (
              <div className="community-replying">
                <span>
                  {label(c.lang, "回复", "Reply to")}{" "}
                  {personName(c.profile(reply.userId), c.lang)}
                </span>
                <button
                  type="button"
                  aria-label={label(c.lang, "取消回复", "Cancel reply")}
                  onClick={() => {
                    setReply(null);
                    setError("");
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="community-composer-input">
              <ProfileAvatar id={ME} />
              <textarea
                ref={input}
                aria-label={label(c.lang, "发表评论", "Write a comment")}
                placeholder={label(
                  c.lang,
                  "写下你的观点…",
                  "Share your thoughts…",
                )}
                value={text}
                maxLength={500}
                rows={2}
                onChange={(event) => setText(event.target.value)}
              />
            </div>
            {error && (
              <p className="community-error" role="alert">
                {error}
              </p>
            )}
            <div className="community-composer-footer">
              <span>{text.length}/500</span>
              <button
                type="submit"
                className="ui-btn ui-btn-primary"
                disabled={!text.trim()}
              >
                <Send size={13} />
                {label(c.lang, "发布", "Post")}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
