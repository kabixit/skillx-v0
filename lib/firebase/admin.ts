import { cert, initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Your Firebase Admin SDK configuration
const firebaseAdminConfig = {
  credential: cert({
    projectId: "skillx-v0",
    clientEmail: "firebase-adminsdk-fbsvc@skillx-v0.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyyd1579o3WRQu\nZKCCKsWkIIqzigWdeBh9E7HMsug4DEjZCTQL0Ju3rA2bfAxl2XUE0YceekRm7OjM\nZqCRuyNBposKJDtADGEU/htyJNYg5QkqpCkOWwZGvOGaBmIihKPPNnQ2tbaWaAfU\n4sbPJBN9qO/Cn4MK7FZE7DqetR60AxEPynFlsBqore37F3KlMcyFh2URR0MyHRmQ\neWTvr+5z9cX2b5MVEgkAZyGIqlQUG9T1RwOV4Cj3jBwJ6bpe5ahSTyEAi+GJW4cc\nlhPW9OQVOeExr6czzLwbTq7/yJFpB0t5TiL8Sz4ljT5eoTV7TsK8uYsxhQtB2on4\nYkNsKm27AgMBAAECggEACdwvgQ8PoNJ31iB/PaPa5zSoPENAu1t+i5SveejlUln9\nwS0hwq5hjXKertQw4YO+/Ay2KqHMQ0TjiIpMZrJvElV7VjbYpwKdGV7zkor3iDQ5\nb4btgLjXvW+jSC778IgSJKu4eF/zJD5egt4disT5kjTj7CmHPO37IAKghP+GJEqY\nubwvnYXSFD7BQObZJxM6aw+Bcmj6fO1i14M0WCn/dnUTuYtnjo6vvAxgPcLxizbg\nsD7aN10i/KrHS5xTB+Y4l3+u+W17kXz2Qd5/JUIXzNMiqBAJ358BYnfScRNHyl2L\nCtu0gpl4hgOyF35RPrDcp+z5inmu/9/sLA8nphaaWQKBgQDdw3LpH0NVNS8hMRkq\n0Vt82axhnyWMZbqF3qReoByQ1+x1ZKehatbSD8qPimPhkBqt5vk5nJe4j4s+RA8b\nteU6gzQblYyIND+rE+1AeMdZBe5IBF9e6JXqv9BIZ5DQpSnG68VQOjFdHXA1OPZc\nQHV7mkonGtZG4VledWm5KLUiVQKBgQDOY/U4ZobdVupsxOLpv42U/hfwEXeQ72Ix\nIZ7r3ZBSpV8HVdm3BWsZF6d7JydzJFTtOhvYaFd0IHuLg0Ece+m0ijdv9e6KBIng\nCSw2bY32CofdCnazLOho2daW4jrzJlFXeiUqC5l1B7hbP4/Vf7v6LpKznxVpfL9O\nsPyTDX3/zwKBgAzbwFX0Ehtmsgzio+rvqLZciLpAWBUD8QTCHBXAgueDHZrQ80dQ\nwpP7hms8Qv5ZNLLQqbLFeaah7Bj4KUgaC+iQovzWdweOwAJTbXZHioeG6IIUftMp\n+UdbR+Bq4OK4MOvvz8kPFr2nb1Ims2I1+pnoIFSUIciKWHw5op+x1I7hAoGAFJ4x\nuh+r62KqapFEpdtH9pFnrMjh6+2uHoBgUunAaDEzDBWMeVcmOsx9I7VmoH8JqOU8\nMONDkUtJbEeBcqoCT9Ha9elYmhsX9vSToSBSpTiqF+/aqc2brhXM9SfGgdHbIGUI\nX2nnO6S4ywzPfqGTEswiRaVnyzD2H5NYuAwKAUsCgYEAtRzvdt362IqaW6F9ISdX\n3XJAqz+LVIB1Mfm3L5fm/S5EhO8l3d4hrxst6cHnGeRQDMv+ByQMPzcyUkJiYKsz\nigxvHpB12etPA3a6CI/tdErWrv6TUujMevzaV7vROa5G/c/22VDpl5clFyciJ2/k\npc5LFfVDo75JkaLZ1SzxfXM=\n-----END PRIVATE KEY-----\n"
  })
};

// Initialize Firebase Admin
let firebaseAdmin: App;

if (!getApps().length) {
  firebaseAdmin = initializeApp(firebaseAdminConfig);
} else {
  firebaseAdmin = getApps()[0];
}

// Export Firebase Admin service
const adminAuth = getAuth(firebaseAdmin);

export { firebaseAdmin, adminAuth };