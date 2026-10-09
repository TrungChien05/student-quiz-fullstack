package com.studentquizz.repository;

import com.studentquizz.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("SELECT f FROM Friendship f JOIN FETCH f.requester JOIN FETCH f.receiver " +
           "WHERE f.requester.id = :requesterId AND f.receiver.id = :receiverId")
    Optional<Friendship> findByRequesterIdAndReceiverId(@Param("requesterId") Long requesterId,
                                                        @Param("receiverId") Long receiverId);

    @Query("SELECT f FROM Friendship f JOIN FETCH f.requester JOIN FETCH f.receiver WHERE " +
           "(f.requester.id = :user1Id AND f.receiver.id = :user2Id) OR " +
           "(f.requester.id = :user2Id AND f.receiver.id = :user1Id)")
    Optional<Friendship> findRelation(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    @Query("SELECT f FROM Friendship f JOIN FETCH f.requester WHERE f.receiver.id = :userId AND f.status = 'PENDING'")
    List<Friendship> findPendingRequests(@Param("userId") Long userId);

    @Query("SELECT f FROM Friendship f WHERE f.requester.id = :userId AND f.status = 'PENDING'")
    List<Friendship> findSentRequests(@Param("userId") Long userId);

    @Query("SELECT f FROM Friendship f JOIN FETCH f.requester JOIN FETCH f.receiver WHERE " +
           "((f.requester.id = :userId) OR (f.receiver.id = :userId)) AND " +
           "f.status = 'ACCEPTED'")
    List<Friendship> findFriends(@Param("userId") Long userId);
}
