// SPDX-License-Identifier: MPL-2.0

use iced::widget::{column, text};
use iced::{Element, Theme};

#[derive(Default)]
struct App;

#[derive(Debug, Clone)]
enum Message {}

impl App {
    fn view(&self) -> Element<'_, Message> {
        column![
            text("OpenE-CAD S3 iced Shell"),
            text("Workbench spike in preparation")
        ]
        .padding(20)
        .spacing(8)
        .into()
    }
}

fn main() -> iced::Result {
    iced::application(|| App, |_app: &mut App, _message: Message| {}, App::view)
        .theme(Theme::Dark)
        .run()
}
