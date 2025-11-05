import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { concatMap, map, Observable, take } from 'rxjs';
import { Chat, Message } from '../models/chat';
import { ProfileUser } from '../models/user-profile';
import { UsersService } from './users.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatsService {
  constructor(
    private http: HttpClient,
    private usersService: UsersService
  ) {}

  get myChats$(): Observable<Chat[]> {
    return this.usersService.currentUserProfile$.pipe(
      concatMap((user) => {
        return this.http
          .get<Chat[]>(`${environment.apiBaseUrl}/chats`, { params: { uid: user?.uid ?? '' } })
          .pipe(map((chats) => this.addChatNameAndPic(user?.uid, chats)));
      })
    );
  }

  createChat(otherUser: ProfileUser): Observable<string> {
    return this.usersService.currentUserProfile$.pipe(
      take(1),
      concatMap((user) =>
        this.http.post<{ id: string }>(`${environment.apiBaseUrl}/chats`, {
          userIds: [user?.uid, otherUser?.uid],
          users: [
            {
              displayName: user?.displayName ?? '',
              photoURL: user?.photoURL ?? '',
            },
            {
              displayName: otherUser.displayName ?? '',
              photoURL: otherUser.photoURL ?? '',
            },
          ],
        })
      ),
      map((res) => res.id)
    );
  }

  isExistingChat(otherUserId: string): Observable<string | null> {
    return this.myChats$.pipe(
      take(1),
      map((chats) => {
        for (let i = 0; i < chats.length; i++) {
          if (chats[i].userIds.includes(otherUserId)) {
            return chats[i].id;
          }
        }

        return null;
      })
    );
  }

  addChatMessage(chatId: string, message: string): Observable<any> {
    return this.usersService.currentUserProfile$.pipe(
      take(1),
      concatMap((user) =>
        this.http.post(`${environment.apiBaseUrl}/chats/${chatId}/messages`, {
          text: message,
          senderId: user?.uid,
        })
      )
    );
  }

  getChatMessages$(chatId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${environment.apiBaseUrl}/chats/${chatId}/messages`);
  }

  addChatNameAndPic(currentUserId: string | undefined, chats: Chat[]): Chat[] {
    chats.forEach((chat: Chat) => {
      const otherUserIndex =
        chat.userIds.indexOf(currentUserId ?? '') === 0 ? 1 : 0;
      const { displayName, photoURL } = chat.users[otherUserIndex];
      chat.chatName = displayName;
      chat.chatPic = photoURL;
    });

    return chats;
  }
}
