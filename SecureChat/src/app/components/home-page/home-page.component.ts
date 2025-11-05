import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  combineLatest,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { Message } from 'src/app/models/chat';
import { ProfileUser } from 'src/app/models/user-profile';
import { ChatsService } from 'src/app/services/chats.service';
import { UsersService } from 'src/app/services/users.service';
import { ImageUploadService } from 'src/app/services/image-upload.service';
import * as CryptoJS from 'crypto-js';



@Component({
  selector: 'app-home',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomeComponent implements OnInit {
/*uploadFile() {
throw new Error('Method not implemented.');
}
onFileSelected($event: Event) {
throw new Error('Method not implemented.');
}*/
  @ViewChild('endOfChat')
  endOfChat!: ElementRef;

  user$ = this.usersService.currentUserProfile$;
  myChats$ = this.chatsService.myChats$;

  searchMessage = new FormControl('');								  
  searchControl = new FormControl('');
  messageControl = new FormControl('');
  chatListControl = new FormControl('');

  messages$: Observable<Message[]> | undefined;
  selectedFile: File | null = null;
  stegoSecret = new FormControl('');
  stegoOtp: string | null = null;
  
					
															
							   
																		
				 
							  
		
	  
   
   

  otherUsers$ = combineLatest([this.usersService.allUsers$, this.user$]).pipe(
    map(([users, user]) => users.filter((u) => u.uid !== user?.uid))
  );

  users$ = combineLatest([
    this.otherUsers$,
    this.searchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([users, searchString]) => {
      return users.filter((u) =>
        u.displayName?.toLowerCase().includes(searchString.toLowerCase())
      );
    })
  );

  selectedChat$ = combineLatest([
    this.chatListControl.valueChanges,
    this.myChats$,
  ]).pipe(map(([value, chats]) => chats.find((c) => c.id === value[0])));

  constructor(
    private usersService: UsersService,
    private chatsService: ChatsService,
    private imageUploadService: ImageUploadService
  ) {}

  ngOnInit(): void {
    this.messages$ = this.chatListControl.valueChanges.pipe(
      map((value) => value[0]),
      switchMap((chatId) => this.chatsService.getChatMessages$(chatId)),
      tap(() => {
        this.scrollToBottom();
      })
    );
	console.log(this.messages$);
							
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
  }

  private generateOtp(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) otp += chars[Math.floor(Math.random() * chars.length)];
    return otp;
  }

  copyOtp() {
    if (!this.stegoOtp) return;
    const el = document.createElement('textarea');
    el.value = this.stegoOtp;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert('OTP copied to clipboard');
  }

  async embedSecretIntoImage(file: File, secretText: string, otp: string): Promise<Blob> {
    // Read original file directly as DataURL (simpler and safer)
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const merged = `${otp},${secretText}` + String.fromCharCode(0);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl as string;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unsupported');
    ctx.drawImage(img, 0, 0);

    const bin = (text: string) => text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
    const bits = bin(merged);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let idx = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
      if (idx < bits.length) {
        imageData.data[i] = (imageData.data[i] & 0xfe) | parseInt(bits[idx++] || '0', 10);
      }
      if (idx < bits.length) {
        imageData.data[i + 1] = (imageData.data[i + 1] & 0xfe) | parseInt(bits[idx++] || '0', 10);
      }
      if (idx < bits.length) {
        imageData.data[i + 2] = (imageData.data[i + 2] & 0xfe) | parseInt(bits[idx++] || '0', 10);
      }
      if (idx >= bits.length) break;
    }
    ctx.putImageData(imageData, 0, 0);

    const out: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/png'));
    return out;
  }

  async sendStegoImage() {
    const file = this.selectedFile;
    const secret = this.stegoSecret.value?.toString() || '';
    const selectedChatId = this.chatListControl.value?.[0];
    if (!file || !secret || !selectedChatId) {
      alert('Select a chat, choose an image, and enter a secret message');
      return;
    }
    const otp = this.generateOtp();
    this.stegoOtp = otp;
    try {
      const blob = await this.embedSecretIntoImage(file, secret, otp);
      const stegoFile = new File([blob], 'stego.png', { type: 'image/png' });
      this.imageUploadService.uploadImage(stegoFile, `images/stego/${Date.now()}`).subscribe({
        next: (url) => {
          // Send a special marker message that will be encrypted as usual
          const marker = `STEGO::URL::${url}`;
          this.chatsService.addChatMessage(selectedChatId, CryptoJS.AES.encrypt(marker, 'my-secret-key').toString()).subscribe(() => {
            this.scrollToBottom();
          });
          // Clear inputs except OTP (so user can copy it)
          this.selectedFile = null;
          this.stegoSecret.setValue('');
        },
        error: () => alert('Failed to upload encoded image')
      });
    } catch (e) {
      alert('Failed to encode image');
    }
  }

  async decodeStegoFromUrl(url: string, enteredOtp: string): Promise<string | null> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let byte = '';
    let result = '';
    let terminated = false;
    for (let i = 0; i < data.length && !terminated; i += 4) {
      byte += (data[i] & 1).toString();
      byte += (data[i + 1] & 1).toString();
      byte += (data[i + 2] & 1).toString();
      while (byte.length >= 8) {
        const code = parseInt(byte.substring(0, 8), 2);
        byte = byte.substring(8);
        if (code === 0) {
          terminated = true;
          break;
        }
        result += String.fromCharCode(code);
      }
    }
    const idx = result.indexOf(',');
    if (idx === -1) return null;
    const embeddedOtp = result.substring(0, idx).trim();
    const secret = result.substring(idx + 1);
    if (embeddedOtp !== enteredOtp.trim()) return null;
    return secret;
  }

  onDecodeStego(url: string) {
    const otp = prompt('Enter OTP to decode the image:');
    if (!otp) return;
    this.decodeStegoFromUrl(url, otp).then((text) => {
      if (text == null) {
        alert('Invalid OTP or corrupted image');
      } else {
        alert('Decoded secret: ' + text);
      }
    });
  }




  createChat(user: ProfileUser) {
    this.chatsService
      .isExistingChat(user.uid)
      .pipe(
        switchMap((chatId) => {
          if (!chatId) {
            return this.chatsService.createChat(user);
          } else {
            return of(chatId);
          }
        })
      )
      .subscribe((chatId) => {
        this.chatListControl.setValue([chatId]);
      });
  }

														 
		getDecryptedMessage(encryptedMessage: string): string {
		if (encryptedMessage) {
      console.log("encrypted: " + encryptedMessage);
      console.log("decrypted: " + CryptoJS.AES.decrypt(encryptedMessage, 'my-secret-key').toString(CryptoJS.enc.Utf8))
      return CryptoJS.AES.decrypt(encryptedMessage, 'my-secret-key').toString(CryptoJS.enc.Utf8);
    } else {
      return "";
    }
    
	}										  
																													
																							   
  /*sendMessage() {
    const message = this.messageControl.value;
    const selectedChatId = this.chatListControl.value[0];
    if (message && selectedChatId) {
	  const encryptedMessage = CryptoJS.AES.encrypt(message, 'my-secret-key').toString();
      const decryptedMessage = CryptoJS.AES.decrypt(encryptedMessage, 'my-secret-key').toString(CryptoJS.enc.Utf8);
      console.log(`Encrypted message: ${encryptedMessage}`);
      console.log(`Decrypted message: ${decryptedMessage}`);																				 
																												   
															
															
      this.chatsService
        .addChatMessage(selectedChatId, encryptedMessage)
        .subscribe(() => {
          this.scrollToBottom();
        });
      this.messageControl.setValue('');
    }
  }*/

  sendMessage(filePath?: string) {
    const message = this.messageControl.value;
    const selectedChatId = this.chatListControl.value[0];
    if (message && selectedChatId) {
      let messageToSend = message;
      if (filePath) {
        messageToSend += ` File: ${filePath}`;
      }
      const encryptedMessage = CryptoJS.AES.encrypt(messageToSend, 'my-secret-key').toString();
      this.chatsService
        .addChatMessage(selectedChatId, encryptedMessage)
        .subscribe(() => {
          this.scrollToBottom();
        });
      this.messageControl.setValue('');
      this.selectedFile = null;
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.endOfChat) {
        this.endOfChat.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
}
