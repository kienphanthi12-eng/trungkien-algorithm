import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.supabase_client import supabase_client

logger = logging.getLogger(__name__)

class LessonService:
    """
    Business Logic Service for Subjects, Topics, Lessons, Progress, and Lesson Sessions.
    Adheres strictly to the pattern: Endpoint -> Service -> Supabase client.
    """

    @staticmethod
    def get_subjects(grade: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Fetch all subjects, optionally filtered by grade.
        """
        try:
            query = supabase_client.table("subjects").select("*").order("order_index")
            if grade is not None:
                query = query.eq("grade", grade)
            resp = query.execute()
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching subjects: {e}")
            return []

    @staticmethod
    def get_topics_by_subject(subject_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all topics under a specific subject.
        """
        try:
            resp = (
                supabase_client.table("topics")
                .select("*")
                .eq("subject_id", subject_id)
                .order("order_index")
                .execute()
            )
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching topics: {e}")
            return []

    @staticmethod
    def get_lessons_by_topic(topic_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all lessons under a specific topic.
        """
        try:
            resp = (
                supabase_client.table("lessons")
                .select("*")
                .eq("topic_id", topic_id)
                .order("order_index")
                .execute()
            )
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching lessons: {e}")
            return []

    @staticmethod
    def get_lesson_by_id(lesson_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a single lesson by ID. Includes topic and subject parent metadata.
        """
        try:
            resp = supabase_client.table("lessons").select("*").eq("id", lesson_id).execute()
            if not resp.data:
                return None
            lesson = resp.data[0]
            
            # Enrich with topic and subject title/grade if available
            topic_resp = supabase_client.table("topics").select("title, subject_id").eq("id", lesson["topic_id"]).execute()
            if topic_resp.data:
                lesson["topic_title"] = topic_resp.data[0]["title"]
                sub_resp = supabase_client.table("subjects").select("name, grade").eq("id", topic_resp.data[0]["subject_id"]).execute()
                if sub_resp.data:
                    lesson["subject_name"] = sub_resp.data[0]["name"]
                    lesson["grade"] = sub_resp.data[0]["grade"]
            return lesson
        except Exception as e:
            logger.error(f"Error fetching lesson {lesson_id}: {e}")
            return None

    @staticmethod
    def get_learning_progress(user_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all learning progress entries for a given student user.
        """
        try:
            resp = (
                supabase_client.table("learning_progress")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            return resp.data or []
        except Exception as e:
            logger.error(f"Error fetching progress for user {user_id}: {e}")
            return []

    @staticmethod
    def upsert_learning_progress(user_id: str, lesson_id: str, status: str, score: int = 0, time_spent: int = 0) -> Dict[str, Any]:
        """
        Upsert a student's learning progress for a specific lesson.
        """
        try:
            # Check if progress record already exists
            existing = (
                supabase_client.table("learning_progress")
                .select("*")
                .eq("user_id", user_id)
                .eq("lesson_id", lesson_id)
                .execute()
            )
            
            payload = {
                "user_id": user_id,
                "lesson_id": lesson_id,
                "status": status,
                "score": score,
                "last_accessed_at": datetime.utcnow().isoformat()
            }
            
            if existing.data:
                # Add up accumulated time
                payload["time_spent"] = existing.data[0].get("time_spent", 0) + time_spent
                # Keep the maximum score if any
                payload["score"] = max(existing.data[0].get("score", 0), score)
                
                resp = (
                    supabase_client.table("learning_progress")
                    .update(payload)
                    .eq("id", existing.data[0]["id"])
                    .execute()
                )
            else:
                payload["time_spent"] = time_spent
                resp = (
                    supabase_client.table("learning_progress")
                    .insert(payload)
                    .execute()
                )
            return resp.data[0] if resp.data else {}
        except Exception as e:
            logger.error(f"Error upserting learning progress: {e}")
            return {}

    @staticmethod
    def get_or_create_lesson_session(user_id: str, lesson_id: str, mode: str) -> Dict[str, Any]:
        """
        Fetch the current lesson session chat history or create a new session if none exists.
        """
        try:
            resp = (
                supabase_client.table("lesson_sessions")
                .select("*")
                .eq("user_id", user_id)
                .eq("lesson_id", lesson_id)
                .eq("mode", mode)
                .execute()
            )
            
            if resp.data:
                return resp.data[0]
            
            # Create new session
            new_session = {
                "user_id": user_id,
                "lesson_id": lesson_id,
                "mode": mode,
                "messages": [],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            insert_resp = supabase_client.table("lesson_sessions").insert(new_session).execute()
            return insert_resp.data[0] if insert_resp.data else {}
        except Exception as e:
            logger.error(f"Error getting/creating lesson session: {e}")
            return {}

    @staticmethod
    def save_lesson_session_chat(session_id: str, messages: List[Dict[str, Any]]) -> bool:
        """
        Save the messages history of a chat session.
        """
        try:
            supabase_client.table("lesson_sessions").update({
                "messages": messages,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", session_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error saving lesson session chat {session_id}: {e}")
            return False
