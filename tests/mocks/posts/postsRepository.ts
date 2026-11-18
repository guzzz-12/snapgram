import { faker } from "@faker-js/faker";
import type { PostType } from "@/types/global";
import { buildMockUser } from "../users/factories";

class MockPostsStore {
  posts: PostType[] = [];

  private buildMockPost(overrides: Partial<PostType> = {}): PostType {
    const imageUrls = Array.from({length: faker.number.int({min: 0, max: 5})}, () => faker.image.url());

    return {
      _id: crypto.randomUUID(),
      user: buildMockUser(),
      content: faker.lorem.paragraphs({min: 1, max: 3}),
      imageUrls,
      postType: imageUrls.length > 0 ? "textWithImage" : "text",
      changeLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  seed(count?: number) {
    const newPosts: PostType[] = [];

    for(let i = 0; i < (count || 30); i++) {
      const post = this.buildMockPost({
        content: `Post ${i+1}`
      });
      
      newPosts.push(post);
    }

    this.posts = newPosts;
  }

  clear() {
    this.posts = [];
  }

  getAllPosts(): PostType[] {
    return this.posts;
  }

  getPostById(postId: string): PostType | undefined {
    return this.posts.find((post) => post._id === postId);
  }

  updatePost(postId: string, content: string): PostType | undefined {
    const index = this.posts.findIndex((post) => post._id === postId);
    if (index === -1) return undefined;

    const updatedPost: PostType = {
      ...this.posts[index],
      content,
      updatedAt: new Date().toISOString()
    };
    this.posts[index] = updatedPost;
    return updatedPost;
  }

  deletePost(postId: string): boolean {
    const prevLength = this.posts.length;
    this.posts = this.posts.filter((post) => post._id !== postId);
    return this.posts.length < prevLength;
  }

  createPost({textContent}: {textContent: string}): PostType {
    const imageUrls = Array.from({length: faker.number.int({min: 0, max: 5})}, () => faker.image.url());

    const newPost: PostType = {
      _id: crypto.randomUUID(),
      user: buildMockUser(),
      content: textContent,
      imageUrls,
      postType: imageUrls.length > 0 ? "textWithImage" : "text",
      changeLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.posts.push(newPost);
    return newPost;
  }
}

export const mockPostsDb = new MockPostsStore();