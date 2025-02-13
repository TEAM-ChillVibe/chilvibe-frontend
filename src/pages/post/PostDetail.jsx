import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPostById, deletePost } from '../../api/post/postApi';
import { myInfo } from '../../api/user/userApi';
import { Box, Typography, List, ListItem, Button, Card } from '@mui/material';
import BaseContainer from '../../components/layout/BaseContainer';
import Comment from '../../pages/comment/Comment';
import TrackListItem from '../../components/common/ListItem/TrackListItem';
import LikeButton from '../../components/common/Button/LikeButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SimpleModal from '../../components/common/Modal/SimpleModal';
import { formatDate } from '../../utils/reusableFn';
import UserProfile from '../../components/common/UserProfile';
import SingleHashtagChips from '../../components/common/HashtagChips/SingleHashtagChips';
import { fetchHashtagsOfPost } from '../../api/hashtag/hashtagApi';
import usePostStore from '../../store/usePostStore';

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [userLike, setUserLike] = useState(false);
  const { likedPosts, loadPostById } = usePostStore(state => ({
    likedPosts: state.likedPosts,
    loadPostById: state.loadPostById,
  }));

  // 현재 사용자가 포스트의 작성자인지 여부를 확인하는 상태
  const [isOwner, setIsOwner] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const getPost = async () => {
      try {
        const postResponse = await fetchPostById(postId); // 게시글 정보 가져오기
        setUserLike(postResponse.userLike); // ✔️ userLike 상태 설정
        console.log('Fetched userLike:', postResponse.userLike); // 여기서 userLike 값이 올바른지 확인
        console.log('Fetched postResponse:', postResponse);
        setPost(postResponse);

        try {
          const userResponse = await myInfo(); // 사용자 정보 가져오기
          console.log('Fetched userResponse:', userResponse); // ✔️ 로그 추가

          // userResponse에 대한 구조 확인
          const postOwnerId = postResponse?.user?.userId;
          const currentUserId = userResponse?.userId || userResponse?.id; // 두 가지 경우 모두 확인

          // 사용자가 로그인했음을 확인
          setIsLoggedIn(true);

          if (postOwnerId && currentUserId) {
            if (String(postOwnerId) === String(currentUserId)) {
              // 동일한 타입으로 변환 후 비교
              setIsOwner(true); // 사용자가 작성자인 경우
            } else {
              setIsOwner(false); // 사용자가 작성자가 아닌 경우
            }
          }
        } catch {
          // 사용자가 로그인되지 않은 경우 (userResponse 가져오기 실패)
          setIsLoggedIn(false);
        }
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    getPost();
  }, [postId]);

  // 렌더링 전 상태를 확인합니다.
  console.log('userLike after fetching post:', userLike); // 현재 상태 확인

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography>Error loading post: {error.message}</Typography>;
  }

  const handleHashtagClick = hashtag => {
    navigate(`/all-tags?hashtag=${hashtag.id}`);
  };

  const handleDelete = async () => {
    try {
      await deletePost(postId);
      setPost(null);
      navigate('/discover');
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      closeModal();
    }
  };

  // ✔️ 줄바꿈
  const convertLineBreaks = text => {
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <BaseContainer>
      <Box sx={{ mb: 2, width: '100%', p: 2 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 2, width: '100%' }}
        >
          <Box display="flex" flexDirection="column" sx={{ gap: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {post.title}
            </Typography>
            <Typography variant="date">
              트랙 {post.playlists.trackCount}개 | {formatDate(post.createdAt)}
            </Typography>
          </Box>
          {isLoggedIn && (
            <Box display="flex" alignItems="center" sx={{ pt: 1 }}>
              <Box display="flex" alignItems="center" sx={{ mr: 3 }}>
                <LikeButton
                  postId={post.id}
                  initialLikeCount={post.likeCount}
                  userLike={likedPosts.includes(post.id)}
                />
              </Box>
              {isOwner && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/edit-post/${postId}`)}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    수정
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={openModal}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    삭제
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* 설명 텍스트 */}
        <Typography variant="body2" sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
          {convertLineBreaks(post.description)}
        </Typography>

        {/* 해시태그 */}
        <SingleHashtagChips
          fetchHashtags={() => fetchHashtagsOfPost(postId)}
          onChipClick={handleHashtagClick}
        />
      </Box>
      {/* 트랙 리스트 */}
      <Typography variant="subtitle1">Tracks</Typography>
      <List sx={{ width: '100%' }}>
        {post.playlists &&
        post.playlists.tracks &&
        post.playlists.tracks.length > 0 ? (
          post.playlists.tracks.map(track => (
            <ListItem key={track.id}>
              <TrackListItem
                music={{
                  name: track.name,
                  artist: track.artist,
                  thumbnailUrl: track.thumbnailUrl,
                  duration: track.duration,
                  previewUrl: track.previewUrl,
                }}
              />
            </ListItem>
          ))
        ) : (
          <Typography variant="body2" sx={{ my: 5, textAlign: 'center' }}>
            플레이리스트에 트랙이 없습니다.
          </Typography>
        )}
      </List>
      {/* 사용자 정보 */}
      <Card sx={{ bgcolor: '#1f1f1f', my: 7, width: '100%' }}>
        <UserProfile user={post.user} />
      </Card>
      {/* 댓글 섹션 */}
      <Typography variant="subtitle1" sx={{ my: 2 }}>
        Comments
      </Typography>
      <Comment postId={postId} user={post.user} />
      {/* postId를 prop으로 전달 */}
      {/* 삭제 모달 */}
      {isOwner && ( // isOwner가 true일 때만 모달 관련 코드를 렌더링
        <SimpleModal
          open={isModalOpen}
          onClose={closeModal}
          title="Delete Post"
          description={`게시글을 삭제하시겠습니까?\n삭제된 게시글은 복구할 수 없습니다.`}
          primaryButtonText="삭제"
          secondaryButtonText="취소"
          onPrimaryClick={handleDelete}
          onSecondaryClick={closeModal}
          primaryButtonStyle="error"
        />
      )}
    </BaseContainer>
  );
};

export default PostDetail;
