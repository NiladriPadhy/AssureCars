import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
    // NOTE: Apply once google-services.json + Firebase config are provided:
    // alias(libs.plugins.google.services)
    // alias(libs.plugins.firebase.crashlytics)
}

// Gemini Vision API key sourced from local.properties (GEMINI_API_KEY=...) or the
// GEMINI_API_KEY environment variable. Never commit the key. Empty = AI disabled (graceful).
val localProps = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

val geminiApiKey: String =
    localProps.getProperty("GEMINI_API_KEY") ?: System.getenv("GEMINI_API_KEY") ?: ""

// Max photos an inspector can attach to a single checklist item. Override via
// local.properties (MAX_IMAGES_PER_ITEM=..) or the MAX_IMAGES_PER_ITEM env var.
// NOTE: superseded per-question by the configurable questionnaire (ConfigItem.maxImages); this
// remains the global fallback default when a question does not specify its own cap.
val maxImagesPerItem: Int =
    (localProps.getProperty("MAX_IMAGES_PER_ITEM") ?: System.getenv("MAX_IMAGES_PER_ITEM"))
        ?.toIntOrNull() ?: 10

// Per-vendor Firebase Realtime Database configuration (build-time; one URL per vendor build).
// Sourced from local.properties or environment; never committed. Empty = offline baseline mode.
fun fbProp(key: String): String = (localProps.getProperty(key) ?: System.getenv(key) ?: "")
val firebaseDbUrl = fbProp("FIREBASE_DB_URL")
val firebaseProjectId = fbProp("FIREBASE_PROJECT_ID")
val firebaseAppId = fbProp("FIREBASE_APP_ID")
val firebaseApiKey = fbProp("FIREBASE_API_KEY")

// Release signing sourced from keystore.properties at the repo root (never committed; see
// keystore.properties.template and ./build.sh). When absent, release builds are left UNSIGNED so
// debug builds and CI keep working — run ./build.sh to generate a keystore and sign release APKs.
val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val hasReleaseKeystore =
    keystoreProps.getProperty("storeFile")?.let { rootProject.file(it).exists() } == true

android {
    namespace = "com.assurecars.vehicleinspection"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.assurecars.vehicleinspection"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "GEMINI_API_KEY", "\"$geminiApiKey\"")
        buildConfigField("String", "GEMINI_MODEL", "\"gemini-2.5-flash\"")
        buildConfigField("int", "MAX_IMAGES_PER_ITEM", "$maxImagesPerItem")

        buildConfigField("String", "FIREBASE_DB_URL", "\"$firebaseDbUrl\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\"$firebaseProjectId\"")
        buildConfigField("String", "FIREBASE_APP_ID", "\"$firebaseAppId\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\"$firebaseApiKey\"")
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasReleaseKeystore) signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(project(":core:model"))
    implementation(project(":core:common"))
    implementation(project(":core:domain"))
    implementation(project(":core:data"))
    implementation(project(":core:datastore"))
    implementation(project(":core:ui"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.splashscreen)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)

    implementation(libs.androidx.navigation.compose)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.hilt.work)
    implementation(libs.androidx.work.runtime.ktx)
    ksp(libs.hilt.compiler)

    implementation(libs.coil.compose)

    implementation(libs.camerax.core)
    implementation(libs.camerax.camera2)
    implementation(libs.camerax.lifecycle)
    implementation(libs.camerax.view)
    implementation(libs.camerax.video)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.truth)
    testImplementation(project(":core:testing"))
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.hilt.android.testing)
    kspAndroidTest(libs.hilt.compiler)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
